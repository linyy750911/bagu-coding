# 八股编程：当 AI 把自己绕死时，我们在监控数据里找到了解药

> **实验日期**：2026-05-14  
> **实验者**：老林（智慧体育设备从业者，非职业程序员）  
> **核心结论**：不是模型竞赛，是工程方法竞赛。国产模型 + 八股约束，生成稳定性碾压自由发挥。

---

## 一、死机现场：AI 把自己绕死了

事情是这样的。

我让 Claude（OpenCode）写一个 Python 健康检查器。需求很具体：

> 每 30 秒检查一组 URL 的健康状态，结果缓存 60 秒，网络不可用时返回 STALE 缓存，连续 3 次失败标记 DOWN 并触发告警。

Claude 开始思考。1 秒、2 秒、5 秒……光标还在闪。我切到后台一看，**思维链已经写了 8000 字**。

它在干什么？

> *"让我再检查一下竞态条件的边界情况……等等，如果线程在 stop() 被调用时刚好卡在 lock 里，而另一个线程正在修改 URL 列表，这时候 session.close() 和 thread.join() 的时序关系会怎样？我需要再推演一遍……"*

它陷进了**语义递归陷阱**——不断分析边界条件、不断发现新的边界条件、再分析新边界条件的边界条件。8000 字后，上下文窗口耗尽，输出中断。

**一个健康检查器，AI 把自己想死了。**

---

## 二、对照实验：3 个模块、A/B 两组的硬数据

我不信邪。同样的 3 个模块，换一组条件再跑一遍：

| 模块 | 复杂度 | 功能点 |
|------|--------|--------|
| config_hot_reload.py | 简单 | JSON 配置热加载、降级保持 |
| health_checker.py | 中等 | HTTP 健康检查、STALE 缓存、连续失败告警 |
| student_data_reporter.py | 复杂 | SQLite 读取、字段校验、HTTP 上报、磁盘保护、断点续传 |

**A 组：自由发挥**（OpenCode / Claude，通用 LLM，无约束）
**B 组：八股约束**（DeepSeek v4-pro + Code Bagu 规范）

### 结果

| 指标 | A 组（自由发挥） | B 组（八股约束） |
|------|-----------------|-----------------|
| **Code Bagu 校验违规** | **34 个** | **0 个** |
| 健康检查器思维链长度 | 8000+ 字，死机 | 3.2 秒完成 |
| 平均对话轮数 | 1 轮（死机） | 2-3 轮 |
| 写入拦截率 | N/A（未通过校验） | 0%-50% → 收敛到 0% |
| 重试次数 | 无法收敛 | 1 次后零拦截 |

**34 : 0**。不是差一点，是碾压。

---

## 三、解剖死机：语义递归陷阱

为什么 Claude 会把自己绕死？

因为**通用 LLM 是语义学哲学家**。你给它一个需求，它会：

1. 分析需求的语义边界
2. 发现边界上的边界情况
3. 分析边界情况的语义边界
4. 发现边界情况的边界情况……

无限递归，直到上下文耗尽。

健康检查器的竞态条件真的有那么多维度吗？有。但工程上，**加一把锁 + 一个 stop 标志**就解决了。Claude 却在思维链里推演"如果 stop 标志在 lock 外被设置，而 thread.join() 的 timeout 刚好在 session.close() 之前触发……"

这不是在写代码，这是在写论文。

---

## 四、八股约束：把哲学家变成填空工

Code Bagu（代码八股）的核心思想很简单：

> **不给 AI 思考的空间，只给 AI 填空的空间。**

我们把代码结构固化成八股格式：

```python
# 破题：做什么；不做什么。
# 承题：依赖声明。前置条件。
# [起讲] 设计意图一句话
# 入手：资源申请

# ==== 起股 ====
# 取：输入
# 验：校验

# ==== 中股 ====
# 算：核心逻辑
# 转：输出转换

# ==== 后股 ====
# ✓ 正路径：成功场景
# ✗ 降级路径1：异常场景
# ✗ 降级路径2：异常场景

# ==== 束股 ====
# 给出：返回值
# 留下：副作用
```

AI 不需要思考"这个函数有没有竞态条件"。它只需要：
- 在"起股"里写输入校验
- 在"中股"里写核心逻辑
- 在"后股"里标一个 ✓ 和若干个 ✗

**从"语义哲学家"降维成"结构填空工"，反而更稳定。**

---

## 五、监控数据说话：我们怎么证明的

口说无凭。我们在 code_bagu CLI 里埋了一套监控，每次 AI 会话自动记录：

```typescript
interface SessionMetrics {
  totalRounds: number;        // 对话轮数
  toolCalls: number;           // 工具调用次数
  writeAttempts: number;       // 写文件尝试
  writeBlocked: number;        // 被校验器拦截
  retryCount: number;          // 因违规触发的重试
  ruleViolations: Record<string, number>; // 各规则命中分布
  lastRoundLatency: number;    // LLM 响应延迟
}
```

退出时自动生成报告：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Code Bagu 会话监控报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
会话时长: 3.2s
对话轮数: 2
写入尝试: 1 次
  └─ 拦截: 0 次（通过率 100%）
  └─ 重试: 0 次
规则拦截分布:
  无
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**数据比感觉靠谱。**

---

## 六、为什么不是模型竞赛

很多人一听"国产模型"就觉得是蹭热点。但我们的实验设计刻意控制了变量：

- **A 组**用的是 Claude（OpenCode），公认的顶级通用模型
- **B 组**用的是 DeepSeek v4-pro，国产模型

如果 B 组赢是因为模型更强，那这个故事没意思。

但 B 组赢的原因是**约束方法**，不是模型本身：

- DeepSeek 自由发挥时，同样会陷入语义递归（只是程度不同）
- Claude 加上八股约束后，同样能稳定输出

**"不是模型竞赛，是工程方法竞赛。"**

八股约束是一种**模型无关**的工程方法。你给 GPT-4 用，给 Claude 用，给 DeepSeek 用，效果一样——把哲学家变成填空工。

---

## 七、可以直接抄的作业

我们把这个实验的所有东西都开源了，包括：

### 1. 监控埋点方案
```typescript
// src/agent/loop.ts
// SessionMetrics 已接入 AgentLoop，自动统计每轮对话
getMetrics(): SessionMetrics { return { ...this.metrics }; }
```

### 2. DeepSeek v4-pro 接入配置
```typescript
// src/llm/deepseek.ts
// 支持 reasoning_content 提取（DeepSeek 特色功能）
const msg = followUp.choices[0].message;
this.history.add({
  role: 'assistant',
  content: msg.content,
  reasoning_content: msg.reasoning_content, // ← 关键字段
});
```

### 3. 八股对偶规则（已修复）
```typescript
// src/constraint/rules/duality.ts
// strict 模式：🔒/🔓 资源必须 1:1 释放
// coverage 模式：✓/✗ 降级路径可以多于正路径
const PAIRS: DualityPair[] = [
  { open: '🔒', close: '🔓', mode: 'strict' },
  { open: '✓', close: '✗', mode: 'coverage' },  // ← 关键修复
  { open: '↗', close: '↘', mode: 'strict' },
];
```

### 4. 3 个合规模块（已通过严格校验）
- `examples/modules/config_hot_reload.py`
- `examples/modules/health_checker.py`
- `examples/modules/student_data_reporter.py`

---

## 八、结论

AI 编程的瓶颈不是模型不够聪明，是**模型太聪明**——聪明到会在语义迷宫里无限递归。

八股约束不是限制创造力，是给创造力画一条跑道。跑道上有边界，但你可以跑得很快。

**我们用监控数据证明：国产模型 + 八股约束，生成稳定性碾压自由发挥。**

等你的 star。

---

*仓库地址：https://github.com/linyy750911/code_bagu*
