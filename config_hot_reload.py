"""
ConfigHotReload — 配置文件热加载器 (config_hot_reload.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: JSON 配置文件路径
  输出: 配置字典 + on_change 回调触发

  数据流向:
    文件系统 → watchdog → 重新加载 → 回调通知 → 消费者

修改风险点:
  ⚠️ 第48行: 文件句柄泄漏，未正确停止 observer
  ⚠️ 第62行: 竞态条件，reload 过程中读取配置

最近修改:
  2026-05-14: initial
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

# 破题：监听 JSON 配置文件变更，热加载并通知订阅者；不做配置项合法性校验（调用方保证）。
# 承题：依赖 watchdog 库监控文件系统。前置条件: 文件路径有效、JSON 格式正确。
# [起讲] 基于 watchdog 的配置热加载器，支持降级保持
# 入手：N/A

import json
import os
import threading
from typing import Any, Callable, Dict, Optional

# 尝试导入 watchdog
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    _HAS_WATCHDOG = True
except ImportError:  # ✗ 降级路径：watchdog 未安装
    _HAS_WATCHDOG = False


class _ConfigEventHandler(FileSystemEventHandler):
    """内部事件处理器，文件变化时触发重载。"""

    def __init__(self, reloader: "ConfigHotReload") -> None:
        self._reloader = reloader

    def on_modified(self, event) -> None:  # type: ignore[override]
        if not event.is_directory and event.src_path == self._reloader._file_path:
            self._reloader._reload()


class ConfigHotReload:
    # ==== 起股 ====
    # 取：配置文件路径
    # 验：文件是否存在、是否可读

    def __init__(self, file_path: str) -> None:
        self._file_path = os.path.abspath(file_path)
        self._config: Dict[str, Any] = {}
        self._callbacks: list[Callable[[Dict[str, Any]], None]] = []
        self._lock = threading.RLock()
        self._observer: Optional[Observer] = None
        self._handler: Optional[_ConfigEventHandler] = None
        self._valid = False
        self._load()  # 首次加载

    # ==== 中股 ====
    # 算：watchdog 监听文件修改事件
    # 转：JSON 解析为 dict

    def _load(self) -> None:
        """从磁盘加载配置，失败时保持上一次有效值。"""
        try:
            with open(self._file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, dict):
                return  # ✗ 降级路径：JSON 根不是对象，保持旧配置
            with self._lock:
                self._config = data
                self._valid = True
        except FileNotFoundError:
            pass  # ✗ 降级路径：文件不存在，保持旧配置
        except json.JSONDecodeError:
            pass  # ✗ 降级路径：JSON 格式错误，保持旧配置
        except PermissionError:
            pass  # ✗ 降级路径：权限不足，保持旧配置

    def _reload(self) -> None:
        """热重载入口：加载新配置并在成功时触发回调。"""
        old_config = dict(self._config)
        self._load()
        with self._lock:
            if self._valid and self._config != old_config:
                for cb in self._callbacks:
                    try:
                        cb(dict(self._config))
                    except Exception:
                        pass  # 回调异常不应中断其他订阅者

    # ==== 后股 ====
    # ✓ 正路径：文件修改 → 重新加载成功 → 触发 on_change
    # ✗ 降级路径1：JSON 格式错误 → 保持旧配置
    # ✗ 降级路径2：文件被删除 → 保持旧配置
    # ✗ 降级路径3：权限不足 → 保持旧配置

    def get(self, key: str, default: Any = None) -> Any:
        """线程安全地读取配置项。"""
        with self._lock:
            return self._config.get(key, default)

    def on_change(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """注册配置变更回调；可多次注册。"""
        with self._lock:
            self._callbacks.append(callback)

    def start(self) -> None:
        """启动文件监听。重复调用幂等。"""
        with self._lock:
            if self._observer is not None:
                return
            if not _HAS_WATCHDOG:
                raise RuntimeError("watchdog 未安装，无法启动热加载")
            # 🔒 申请 observer 资源
            self._handler = _ConfigEventHandler(self)
            self._observer = Observer()
            watch_dir = os.path.dirname(self._file_path)
            self._observer.schedule(self._handler, watch_dir, recursive=False)
            self._observer.start()

    def stop(self) -> None:
        """停止监听并释放文件句柄。重复调用幂等。"""
        with self._lock:
            if self._observer is None:
                return
            # 🔓 释放 observer 资源
            self._observer.stop()
            self._observer.join()
            self._observer = None
            self._handler = None

    # ==== 束股 ====
    # 给出：dict / Any
    # 留下：N/A

    def __enter__(self) -> "ConfigHotReload":
        self.start()
        return self

    def __exit__(self, *args: Any) -> None:
        self.stop()
