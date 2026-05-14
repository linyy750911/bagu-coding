"""
HealthChecker — 带本地缓存的 HTTP 状态检查器 (health_checker.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: URL 列表 + 检查周期(30s)
  输出: 健康状态字典 {url: {"status": "UP|DOWN|STALE", "latency_ms": int}}

  数据流向:
    URL 列表 → 定时器 → HEAD 请求 → 缓存更新 → 状态判断 → 告警回调

修改风险点:
  ⚠️ 第58行: 线程泄漏，未正确停止 timer/executor
  ⚠️ 第82行: 竞态条件，缓存读写无锁保护

最近修改:
  2026-05-14: initial
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

# 破题：定时检查一组 URL 的 HTTP 健康状态并缓存结果；不做 DNS 预解析优化（依赖系统解析）。
# 承题：依赖 urllib 标准库，无第三方依赖。前置条件: URL 合法、网络可达。
# [起讲] 带 STALE 降级和连续失败告警的健康检查器
# 入手：N/A

import threading
import time
from typing import Callable, Dict, Optional, Set
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError


class HealthChecker:
    # ==== 起股 ====
    # 取：URL 列表
    # 验：URL 格式合法性

    def __init__(
        self,
        interval: float = 30.0,
        timeout: float = 5.0,
        cache_ttl: float = 60.0,
        fail_threshold: int = 3,
        on_alert: Optional[Callable[[str, str], None]] = None,
    ) -> None:
        self._interval = interval
        self._timeout = timeout
        self._cache_ttl = cache_ttl
        self._fail_threshold = fail_threshold
        self._on_alert = on_alert
        self._urls: Set[str] = set()
        self._cache: Dict[str, dict] = {}
        self._fail_counts: Dict[str, int] = {}
        self._lock = threading.RLock()
        self._timer: Optional[threading.Timer] = None
        self._running = False

    # ==== 中股 ====
    # 算：每 30s 发起 HEAD 请求，5s 超时
    # 转：HTTP 状态码 → UP / DOWN / STALE

    def add_url(self, url: str) -> None:
        """动态增加监控 URL；线程安全。"""
        with self._lock:
            self._urls.add(url)
            self._fail_counts[url] = 0

    def remove_url(self, url: str) -> None:
        """动态移除监控 URL；线程安全。"""
        with self._lock:
            self._urls.discard(url)
            self._fail_counts.pop(url, None)
            self._cache.pop(url, None)

    def _check_one(self, url: str) -> dict:
        """对单个 URL 执行 HEAD 检查。"""
        try:
            req = Request(url, method="HEAD")
            start = time.time()
            with urlopen(req, timeout=self._timeout) as resp:
                latency = int((time.time() - start) * 1000)
                return {"status": "UP", "latency_ms": latency, "code": resp.status}
        except HTTPError as e:
            return {"status": "DOWN", "latency_ms": -1, "code": e.code}
        except URLError:
            return {"status": "DOWN", "latency_ms": -1, "code": 0}
        except Exception:
            return {"status": "DOWN", "latency_ms": -1, "code": 0}

    def _tick(self) -> None:
        """一轮检查：遍历所有 URL，更新缓存与失败计数。"""
        with self._lock:
            urls = list(self._urls)

        for url in urls:
            result = self._check_one(url)
            with self._lock:
                if result["status"] == "UP":
                    self._cache[url] = {**result, "ts": time.time()}
                    if self._fail_counts.get(url, 0) > 0:
                        # ↘ 重置连续失败计数
                        self._fail_counts[url] = 0
                else:
                    # ↗ 连续失败计数 +1
                    self._fail_counts[url] = self._fail_counts.get(url, 0) + 1
                    if self._fail_counts[url] >= self._fail_threshold:
                        self._fail_counts[url] = 0  # 触发后清零，避免重复告警
                        if self._on_alert:
                            try:
                                self._on_alert(url, f"连续 {self._fail_threshold} 次检查失败")
                            except Exception:
                                pass

    def _schedule(self) -> None:
        """调度下一次检查。"""
        if not self._running:
            return
        self._tick()
        with self._lock:
            if self._running:
                self._timer = threading.Timer(self._interval, self._schedule)
                self._timer.start()

    # ==== 后股 ====
    # ✓ 正路径：HEAD 200 → 更新缓存 → 状态 UP
    # ↘ 重置连续失败计数
    # ✗ 降级路径1：请求超时 → 返回 STALE 缓存
    # ✗ 降级路径2：网络断开 → 返回 STALE 缓存
    # ✗ 降级路径3：HTTP 5xx → 连续计数+1 → 达到3次触发告警
    # ↗ 连续失败计数 +1
    # ✗ 降级路径4：URL 动态移除 → 停止对该 URL 的监听

    def start(self) -> None:
        """启动定时检查；重复调用幂等。"""
        with self._lock:
            if self._running:
                return
            # 🔒 申请定时器线程资源
            self._running = True
            self._timer = threading.Timer(self._interval, self._schedule)
            self._timer.start()

    def stop(self) -> None:
        """停止检查并释放线程资源；重复调用幂等。"""
        with self._lock:
            if not self._running:
                return
            # 🔓 释放定时器线程资源
            self._running = False
            if self._timer is not None:
                self._timer.cancel()
                self._timer.join()
                self._timer = None

    def get_status(self, url: str) -> dict:
        """获取 URL 当前状态；网络不可用时返回 STALE 缓存。"""
        with self._lock:
            cached = self._cache.get(url)
            if cached is not None and (time.time() - cached["ts"]) < self._cache_ttl:
                return {"status": "UP", "latency_ms": cached["latency_ms"], "source": "fresh"}
            if cached is not None:
                return {"status": "STALE", "latency_ms": cached["latency_ms"], "source": "cache"}
            return {"status": "UNKNOWN", "latency_ms": -1, "source": "none"}

    # ==== 束股 ====
    # 给出：dict
    # 留下：N/A

    def __enter__(self) -> "HealthChecker":
        self.start()
        return self

    def __exit__(self, *args: object) -> None:
        self.stop()
