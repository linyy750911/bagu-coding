# PR1 并发改造报告（脱敏版）

> 项目：智慧体育训练站系统
> 时间：2026-05
> 状态：前端改造完成 + 后端改造完成（双模式兼容）

---

## 一、问题背景

智慧体育训练站原架构为**单任务模式**：一个面板机同一时刻只能运行一个训练任务。实际场景中（如多跑道短跑），需要**同一面板机并发执行多个独立任务**，互不干扰。

**核心矛盾**：
- 前端：所有状态存在全局变量，多任务时状态互相覆盖
- 后端：拦截器按 `sourceIp` 加 3 秒锁，同一设备重复请求被拦截；旧任务创建时自动删除同设备旧任务

---

## 二、前端改造（athlete-master）

### 2.1 架构设计：TaskState 隔离模型

```dart
// 新建 TaskState 封装 55 个任务级状态
class TaskState {
  RxString taskId = ''.obs;
  RxString pageState = ''.obs;
  RxBool hasStart = false.obs;
  RxList<TestUser> userGroup = <TestUser>[].obs;
  // ... 共55个状态字段
}

// HomeController 中按 taskId 隔离
Map<String, TaskState> taskStateMap = {};
TaskState get currentTaskState => taskStateMap[taskId.value] ?? _defaultState;
```

### 2.2 双模式兼容（开关控制）

```dart
bool concurrentMode = false; // 默认关闭，可随时回滚

// processMessage 双模式路由
void processMessage(dynamic message) async {
  if (concurrentMode) {
    await _processMessageConcurrent(message);
  } else {
    await _processMessageLegacy(message);
  }
}
```

### 2.3 UI 零侵入兼容层

新增 8 个自动路由 getter，UI 层 `Obx(() => controller.pageState.value)` **完全不用改**：

| 原全局变量 | 并发模式自动路由到 | UI 是否需要改 |
|-----------|-----------------|-------------|
| `pageState` | `currentTaskState.pageState` | ❌ 不用 |
| `hasStart` | `currentTaskState.hasStart` | ❌ 不用 |
| `userGroup` | `currentTaskState.userGroup` | ❌ 不用 |
| `pageData` | `currentTaskState.pageData` | ❌ 不用 |
| `perc` | `currentTaskState.perc` | ❌ 不用 |
| `currentProgress` | `currentTaskState.currentProgress` | ❌ 不用 |
| `eventList` | `currentTaskState.eventList` | ❌ 不用 |
| `finishedUserList` | `currentTaskState.finishedUserList` | ❌ 不用 |

### 2.4 关键陷阱与修复

**RxString 序列化陷阱**
- 现象：`taskId` 改为 `RxString` 后，Dio `jsonEncode` 触发 `'String has no method [toJson]'`
- 修复：JSON body 中 `"taskId": c.taskId` → `"taskId": c.taskId.value`
- 范围：前端 17 处 + 6 个运动模板，共 23 处
- 验证：800米全流程回归通过（2分48秒，后台零报错）

**IPv6 过滤**
- 现象：面板机获取到 `fe80::` 导致设备注册失败
- 修复：`ip_util.dart` 过滤 IPv6 和回环地址

---

## 三、后端改造（training-station）

### 3.1 改造点总览

| 瓶颈 | 位置 | 原逻辑 | 新逻辑 |
|------|------|--------|--------|
| 3秒锁 | `TrainingTaskInterceptor` | 按 `sourceIp` 加锁 | 按 `sourceIp_taskId` 加锁 |
| 旧任务删除 | `TrainingTaskInterceptor` | 无条件删除同设备旧任务 | 并发模式下不删除 |
| 路由表去重 | `TrainingController` | 按 `checkin_screen_ip` 去重 | 按 `taskId` 去重 |
| Pole 单值绑定 | `TrainingController` | `pole.setTask_id(taskId)` | Pole clone 入路由表 |

### 3.2 关键代码对比

**锁改造（TrainingTaskInterceptor）**
```java
// 改造前
String lockKey = trb.getSourceIp();

// 改造后
String lockKey = trb.getSourceIp() + "_" + taskId;
```

**旧任务删除改造**
```java
// 改造前：无条件删除
for (String key : taskKeyList) {
    cache.cacheMap.remove(key);
    cache.cacheTempDataMap.remove(key);
    cache.rawDataQueueMap.remove(key);
}

// 改造后：并发模式下不删除
if (!cache.concurrentMode) {
    // 原有删除逻辑
}
```

### 3.3 后端并发影响分析报告

详见 [BACKEND_CONCURRENCY_IMPACT.md](../../docs/BACKEND_CONCURRENCY_IMPACT.md)（完整版在脱敏仓库中）。

核心结论：
- `cacheMap` / `cacheTempDataMap` / `rawDataQueueMap` / `cacheTaskPlayback` **已经支持多任务**（按 taskId 隔离）
- 问题出在**拦截器锁**和**路由表去重逻辑**上
- 改造后：同一面板机可并发创建多个任务，每个任务独立接收 AI 数据、独立结算成绩

---

## 四、验证数据

### 4.1 前端验证

| 验证项 | 结果 | 备注 |
|--------|------|------|
| flutter analyze | ✅ 0 error / 0 warning | lint 清理后 |
| 800米全流程 | ✅ 通过 | 2分48秒，后台零报错 |
| 并发模式开关 | ✅ 双向可切 | `concurrentMode = false` 回滚到老逻辑 |
| 单任务回归 | ✅ 通过 | A模式单批次测试通过 |

### 4.2 后端验证

| 验证项 | 结果 | 备注 |
|--------|------|------|
| 单任务创建 | ✅ 通过 | 兼容老逻辑 |
| 并发任务创建（间隔<3秒） | ✅ 通过 | 改造前第2个被拦截 |
| AI 数据路由 | ✅ 通过 | 每个任务独立接收数据 |
| 成绩结算 | ✅ 通过 | 各任务成绩互不干扰 |

---

## 五、Git 提交记录

### 前端（athlete-master）
```
add022f feat: 生成 BaguRAG 精简项目地图 PROJECT_MAP.md + AGENTS.md
9e86899 fix(PR1): RxString 序列化兼容 + IPv6 过滤
fa9240d frontend: WebSocket 按 taskId 隔离 + onClose 释放全部 TaskState
0b2b66a PR1: UI 兼容层 getter（8个常用状态变量自动路由）
fe84d96 PR1: 填充 finish/completed 成绩结算 TODO
32cfa87 PR1: 修复 flutter analyze 编译错误
de03537 PR1: 拆分 startSport + processMessage 双模式路由
ca1f819 PR1: 状态模型隔离地基（TaskState + concurrentMode）
```

### 后端（training-station）
```
2d3970e8 chore(bagu): 八股化注释 + PR1并发改造
f8cebba6 docs(bagu): 后端并发影响分析报告
60d8be0b docs(bagu): 后端并发改造代码补八股注释
8d2161ea backend: 拆并发锁支持面板机多任务
```

---

## 六、八股方法论应用

本次改造全程使用 **Bagu（八股）约束驱动开发**：

1. **PROJECT_MAP.md 秒懂**：新会话 AI 通过精简项目地图 5 分钟理解 55 个状态字段的并发隔离方案
2. **八股注释规范**：所有类和方法强制包含 `/// [模块] 功能描述。输入: ... 处理: ... 输出: ...`
3. **BaguRAG 索引**：代码修改后自动更新向量索引，支持语义搜索定位
4. **双模式兼容**：通过 `concurrentMode` 开关实现零风险灰度，随时可回滚

---

## 七、经验沉淀

| 经验 | 说明 |
|------|------|
| 状态隔离 > 全局变量 | 多任务场景必须按 taskId 隔离状态，不能靠约定 |
| 双模式兼容是底线 | 生产环境改造必须支持开关回滚，不能一刀切 |
| UI 零侵入兼容层 | 通过 getter 自动路由，避免改动数十个 UI 文件 |
| RxString 序列化陷阱 | GetX 的 `Rx<T>` 重写 `toJson()`，JSON 序列化必须取 `.value` |
| 后端锁粒度 | 设备级锁 → 任务级锁，是并发改造的核心 |
