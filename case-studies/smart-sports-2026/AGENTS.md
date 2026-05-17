# AGENTS.md — 智慧体育训练站项目上下文（脱敏版）

## 项目概览

本项目是**智慧体育训练站**系统，包含前后端两个子项目：

| 项目 | 技术栈 | 路径 | 状态 |
|------|--------|------|------|
| athlete-master | Flutter 3.41.7 / Dart | `athlete-master/` | 前端面板机应用，PR1并发改造完成 |
| training-station | Java Spring Boot 3.2.15 | `training-station/` | 工控机后端服务 |

## 关键上下文

### PR1 并发改造（双模式兼容）
- **前端**: `HomeController.concurrentMode = false`（默认回滚到老逻辑）
  - `taskId` 已改为 `RxString` 用于并发隔离
  - `taskStateMap` 按 taskId 隔离 TaskState
  - WebSocket `wsMap/channelMap` 按 taskId 隔离
  - 8个UI兼容getter自动路由到 `currentTaskState`
- **后端**: `cache.concurrentMode = false`
  - `sourceDeviceLockMap` 锁 key 改为 `sourceIp_taskId`
  - `rawdataRoutingMap` 按 taskId 清理
  - Pole clone 入路由表

### RxString 序列化陷阱（已全局修复）
- **根因**: GetX 的 `Rx<T>` 重写 `toJson()`，对 `Rx<String>` 调用 `String.toJson()` 报错 `'String has no method [toJson]'`
- **规则**: 所有 JSON body 中 `"taskId": c.taskId` 必须改为 `"taskId": c.taskId.value`
- **字符串插值 `${c.taskId}` 不受影响**（自动 toString）
- **已修复**: 前端 17 处 + 6 个运动模板，共 23 处

### 已知修复记录
- **IPv6 过滤**: `ip_util.dart` 已过滤 IPv6 地址，解决 "未配置该设备信息" 问题
- **800米联调通过**: 2分48秒，后台零报错，成绩入库正常
- **lint 清理**: 0 error / 0 warning / ~130 info（avoid_unnecessary_containers 等，不影响编译）
- **死代码删除**: `face_detector_service_optimized.dart` 已移除（零引用）

### 人脸架构
- 工控机数据库 `athlete_faces` 只存索引
- 实际人脸底库分散在各面板机（HTTP API 下发）和 边缘AI算力盒 本地

## 联调环境

| 组件 | 地址 | 说明 |
|------|------|------|
| 工控机 | `trainingstation@工控机内网地址` (密码 `[密码]`) | 运行 ts-entrypoint.jar |
| 面板机 | `面板机ADB地址` (WiFi ADB) | Android 平板 |
| mac 本机 | `开发机地址` | 开发机 |

## 如何使用 PROJECT_MAP.md

`PROJECT_MAP.md` 是从 BaguRAG 索引提取的精简版项目地图，按模块/文件/类/方法组织，每个方法附带八股注释描述。

**定位问题时优先查阅此地图**，而不是从头搜索代码：

1. **按功能关键词搜索**: 地图中的方法名和八股注释包含了功能语义（如 `createTask`、`processMessage`、`resetPicture`）
2. **按模块定位**: 前端模块 = 目录名（controller/service/model/...），后端模块 = Maven 模块名（ts-training/ts-identity/...）
3. **按文件定位**: 每个条目包含完整文件路径和相对位置

## 项目地图文件

- **精简项目地图**: `PROJECT_MAP.md`（本文档同级目录）
- **前端完整向量索引**: `bagu_rag_index.json`（74KB，129个方法文档）
- **后端完整向量索引**: `../training-station/bagu-report-lite/bagu_rag_index.json`（27MB，3191个方法文档）

## 开发约定

- **文件名保持原样**: 已确认 `E-3-8.dart` 等文件名不改，避免 import 路径、路由反射、CI 脚本破坏
- **八股注释**: 所有类和方法必须包含八股注释，格式为 `/// [模块] 功能描述。输入: ... 处理: ... 输出: ...`
- **BaguRAG 索引更新**: 代码修改后需重新运行 `python3 tools/bagu_rag_dart.py .`（前端）或 `python3 tools/bagu_rag.py .`（后端）
