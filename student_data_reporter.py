"""
StudentDataReporter — 学生体测数据上报模块 (student_data_reporter.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: SQLite sports_data.db (status='pending')
  输出: HTTP POST 上报结果 + DB 状态更新

  数据流向:
    SQLite → 读取 pending → 字段校验 → HTTP POST → 更新 status → 断点续传标记

修改风险点:
  ⚠️ 第75行: DB 连接未正确关闭导致锁库
  ⚠️ 第98行: 磁盘满时未停止接收新数据
  ⚠️ 第113行: 断点续传标记丢失导致重复上报

最近修改:
  2026-05-14: initial
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

# 破题：从 SQLite 读取体测 pending 记录并 HTTP 上报；不做数据清洗（入库前已保证格式）。
# 承题：依赖 sqlite3 + urllib 标准库。前置条件: DB 存在且可读写、endpoint 可达。
# [起讲] 带字段校验、磁盘保护和断点续传的数据上报模块
# 入手：N/A

import json
import sqlite3
import time
import shutil
from typing import Callable, Dict, List, Optional, Tuple
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


class StudentDataReporter:
    # ==== 起股 ====
    # 取：sports_data.db 中 status='pending' 记录
    # 验：height(100-250), weight(20-200), jump_count(0-999), run_time(0-600), timestamp 非未来

    def __init__(
        self,
        db_path: str = "sports_data.db",
        endpoint: str = "http://localhost:8080/upload",
        timeout: float = 5.0,
        disk_threshold_mb: float = 500.0,
        db_fail_threshold: int = 3,
        on_alert: Optional[Callable[[str], None]] = None,
    ) -> None:
        self._db_path = db_path
        self._endpoint = endpoint
        self._timeout = timeout
        self._disk_threshold_mb = disk_threshold_mb
        self._db_fail_threshold = db_fail_threshold
        self._on_alert = on_alert
        self._db_fail_count = 0
        self._suspicious = False

    # ==== 中股 ====
    # 算：HTTP POST 上报，5s 超时
    # 转：响应码 → uploaded / failed / pending(重试)

    def _check_disk(self) -> bool:
        """检查磁盘剩余空间是否充足。"""
        try:
            usage = shutil.disk_usage(self._db_path)
            free_mb = usage.free / (1024 * 1024)
            return free_mb >= self._disk_threshold_mb
        except Exception:
            return False

    def _validate_record(self, record: dict) -> Tuple[bool, str]:
        """校验单条体测记录字段。"""
        try:
            h = float(record.get("height", 0))
            w = float(record.get("weight", 0))
            j = int(record.get("jump_count", 0))
            r = float(record.get("run_time", 0))
            ts = float(record.get("timestamp", 0))
        except (ValueError, TypeError):
            return False, "字段类型错误"

        if not (100 <= h <= 250):
            return False, f"height 越界: {h}"
        if not (20 <= w <= 200):
            return False, f"weight 越界: {w}"
        if not (0 <= j <= 999):
            return False, f"jump_count 越界: {j}"
        if not (0 <= r <= 600):
            return False, f"run_time 越界: {r}"
        if ts > time.time():
            return False, "timestamp 为未来时间"
        return True, ""

    def _post_record(self, record: dict) -> Tuple[bool, int]:
        """HTTP POST 单条记录；返回 (success, status_code)。"""
        try:
            payload = json.dumps(record).encode("utf-8")
            req = Request(
                self._endpoint,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(req, timeout=self._timeout) as resp:
                return True, resp.status
        except HTTPError as e:
            return False, e.code
        except URLError:
            return False, 0
        except Exception:
            return False, 0

    def _update_status(self, record_id: int, status: str) -> bool:
        """更新单条记录的 status；失败返回 False。"""
        # 🔒 申请 DB 连接资源
        conn: Optional[sqlite3.Connection] = None
        try:
            conn = sqlite3.connect(self._db_path)
            conn.execute(
                "UPDATE sports_data SET status = ? WHERE id = ?",
                (status, record_id),
            )
            conn.commit()
            return True
        except Exception:
            return False
        finally:
            # 🔓 释放 DB 连接资源
            if conn is not None:
                conn.close()

    def _fetch_pending(self, batch_size: int = 100) -> List[dict]:
        """读取一批 pending 记录；连续失败时标记可疑。"""
        # 🔒 申请 DB 连接资源
        conn: Optional[sqlite3.Connection] = None
        try:
            conn = sqlite3.connect(self._db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT * FROM sports_data WHERE status = 'pending' ORDER BY id LIMIT ?",
                (batch_size,),
            )
            rows = [dict(row) for row in cursor.fetchall()]
            # ↘ 重置 DB 失败计数
            if self._db_fail_count > 0:
                self._db_fail_count = 0
                self._suspicious = False
            return rows
        except Exception:
            # ↗ DB 读取失败计数 +1
            self._db_fail_count += 1
            if self._db_fail_count >= self._db_fail_threshold:
                self._suspicious = True
                if self._on_alert:
                    try:
                        self._on_alert(
                            f"连续 {self._db_fail_threshold} 次 DB 读取失败，后续数据可疑"
                        )
                    except Exception:
                        pass
            return []
        finally:
            # 🔓 释放 DB 连接资源
            if conn is not None:
                conn.close()

    # ==== 后股 ====
    # ✓ 正路径：校验通过 → POST 200 → 更新 uploaded → 断点标记清除
    # ✗ 降级路径1：字段校验失败 → 标记 failed
    # ✗ 降级路径2：POST 4xx → 标记 failed
    # ✗ 降级路径3：POST 5xx/超时 → 保持 pending，稍后重试
    # ✗ 降级路径4：连续 3 次 DB 读取失败 → 标记后续数据可疑
    #   ↗ DB 读取失败计数 +1
    #   ↘ 重置 DB 失败计数
    # ✗ 降级路径5：磁盘 < 500MB → 停止接收新数据，告警

    def process_batch(self) -> Dict[str, int]:
        """处理一批 pending 记录；返回统计信息。"""
        stats = {"processed": 0, "uploaded": 0, "failed": 0, "retry": 0}

        if not self._check_disk():
            if self._on_alert:
                try:
                    self._on_alert("磁盘空间不足 500MB，停止接收新数据")
                except Exception:
                    pass
            return stats

        records = self._fetch_pending()
        for rec in records:
            stats["processed"] += 1
            record_id = rec.get("id")
            if record_id is None:
                continue

            valid, reason = self._validate_record(rec)
            if not valid:
                self._update_status(record_id, "failed")
                stats["failed"] += 1
                continue

            ok, code = self._post_record(rec)
            if ok:
                self._update_status(record_id, "uploaded")
                stats["uploaded"] += 1
            elif 400 <= code < 500:
                self._update_status(record_id, "failed")
                stats["failed"] += 1
            else:
                # 5xx / 超时 / 网络异常：保持 pending，稍后重试
                stats["retry"] += 1

        return stats

    def is_suspicious(self) -> bool:
        """返回当前是否处于数据可疑状态。"""
        return self._suspicious

    # ==== 束股 ====
    # 给出：dict / bool
    # 留下：断点续传标记（pending 状态本身即为断点）
