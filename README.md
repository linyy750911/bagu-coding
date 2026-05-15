<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/AI-DeepSeek%20%2B%20Kimi-8A2BE2" alt="AI: DeepSeek + Kimi">
  <img src="https://img.shields.io/badge/国家-🇨🇳国产方案-red" alt="Made in China">
</p>

# Code Bagu（代码八股）— 让不懂代码的人也能指挥 AI 写工程

> **首创：老林**（智慧体育设备从业者，非职业程序员）  
> 灵感来自父亲教语文写诗时对格式的严格追求。  
> 2026-05-14 发布首个带监控数据的对比实验报告。

> **我们用监控数据证明：国产模型 + 八股约束，生成稳定性碾压自由发挥。**
>
> 一份 8000 字思维链死机现场 vs 3.2 秒完成的对照实验 → [ARTICLE.md](./ARTICLE.md)

[English](#english-abstract) | [快速上手](#最速上手3-分钟) | [实验数据](#实验数据) | [CLI 使用](#cli-使用) | [贡献](CONTRIBUTING.md)

---

## English Abstract

**Code Bagu** is a structured annotation protocol for AI-assisted coding. Instead of writing free-form comments, developers follow a fixed "eight-part" template that tells AI exactly where to put boundary conditions, degradation paths, and resource cleanup logic.

**Key results (verified by controlled experiment):**
- Bug iteration: **15 rounds → 3-5 rounds**
- Code review efficiency: **4-6x faster** (checklist vs. reading comprehension)
- Exception handling search: **30s → 5s** (regex `==== 后股 ====` vs. full-text scan)
- AI semantic recursion death: **8000-word thought chain → 3.2s completion**
- Code Bagu strict check: **34 violations → 0 violations**

**Why Chinese AI models (DeepSeek + Kimi):**
- DeepSeek's low-cost long-context handles requirements preprocessing
- Kimi's 200K context window fits your entire project + Bagu spec
- Structured constraints compensate for cheaper models' tendency to drift

**Target audience:** Non-programmer founders, product managers, QA engineers — anyone who needs AI to write production-quality code but can't review every line.

---

以下是中文全文。

---

## 一句话说明

八股编码是一套**给 AI 看的结构化注释协议**。你不懂代码，但能看懂"有没有降级路径"；AI 看得懂结构，第一遍就把边界钉死。

**效果：跳绳算法从改 15 遍降到 3-5 遍；健康检查器从 8000 字死机到 3.2 秒完成。**

---

## 适合谁

- ✅ 不懂代码，但不得不让 AI 做项目的人
- ✅ 被"改第 8 遍还是崩"折磨过的人
- ✅ 觉得国外模型贵、想用好国产 AI 的人
- ✅ 团队协作时，代码审查变成"自由阅读理解"的人

---

## 核心思路

| 传统方式 | 八股编码 |
|---------|---------|
| AI 写一版 → 你现场测 → 发现边界漏了 → 重写 | AI 先出八股框架 → 你检查结构 → 结构对了再填代码 |
| 你靠体感判断"这次好像对了" | 你扫一眼结构标记 → 判断"结构完整 = 逻辑完整" |
| 异常处理藏在第 144 行，找半天 | 搜索 `==== 后股 ====`，5 秒定位 |

---

## 支持语言

- ✅ Python (`.py`)
- ✅ TypeScript / JavaScript (`.ts` `.tsx` `.js` `.jsx` `.mjs` `.cjs`)
- ✅ Go (`.go`)
- ✅ Rust (`.rs`)
- ✅ Java (`.java`)
- ✅ Ruby (`.rb`)
- ✅ SQL (`.sql`)
- ✅ Shell / Bash / Zsh (`.sh` `.bash` `.zsh`)
- ✅ C / C++ (`.c` `.cpp` `.cc` `.cxx` `.h` `.hpp`)

多语言改造完成于 2026-05-15，原有 Python 规则 100% 兼容。

> **🎯 八股自举进行中**
> 工具本身的源码正在逐步遵守 Code Bagu 规范。
> 已完成：`src/languages/registry.ts` ✅
> 已完成：`src/constraint/engine.ts` ✅
> 已完成：`src/config/loader.ts` ✅
> 已完成：`src/agent/loop.ts` ✅
> 已完成：`src/constraint/prompt.ts` ✅
> 已完成：`src/index.ts` ✅
> 已完成：`src/agent/tools.ts` ✅
> 已完成：`src/cli/chat.ts` ✅
> 已完成：`src/constraint/validator.ts` ✅
> 已完成：`src/constraint/rules/topology.ts` ✅
> 已完成：`src/constraint/rules/bagu.ts` ✅
> 已完成：`src/constraint/rules/duality.ts` ✅
> 已完成：`src/constraint/rules/format.ts` ✅
> 已完成：`src/constraint/rules/empty-bagu.ts` ✅
> 进行中：`src/cli/check.ts` / `src/cli/init.ts` / `src/agent/context.ts` / `src/agent/history.ts` / `src/agent/metrics.ts`
> 目标：全部核心代码自举完成。

---

## 双引擎流水线

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  你说需求   │  →   │ DeepSeek    │  →   │ Kimi Code   │
│  (人话)     │      │ 预处理      │      │ 执行八股    │
└─────────────┘      └─────────────┘      └─────────────┘
                          ↓                    ↓
                    拆成结构化指令          按八股格式输出
                    （做什么/不做什么）      （破题/起股/中股/后股/束股）
```

**为什么国产组合能赢：**
- DeepSeek 上下文便宜，适合长文本预处理
- Kimi 200K 上下文，装得下你的项目 + 八股规范
- 八股约束弥补了"便宜模型容易发散"的短板

---

## CLI 使用

本项目已内置 `codebagu` CLI，支持八股约束自动校验与监控埋点：

```bash
# 安装
npm install -g codebagu

# 初始化项目
codebagu init

# 开始 AI 编程会话（自动加载 .env 中的 DEEPSEEK_API_KEY）
codebagu

# 离线检查代码合规性
codebagu check ./src --strict
```

**监控埋点**：会话结束时自动生成 `SessionMetrics` 报告，保存到 `.codebagu/session-report.json`。

---

## 文件说明

| 文件 | 用途 |
|------|------|
| `code_bagu_skill.md` | **Skill 本体**，复制到 Kimi Code 的 System Prompt 或 Skill 设置里 |
| `USAGE_GUIDE.md` | **外行人手把手教程**，从零开始配置 |
| `ARTICLE.md` | **核心传播文章**：8000 字死机现场 vs 3.2 秒完成的对照实验 |
| `examples/golden_template_*.md` | **黄金八股模板**，不同模块的填空模板 |
| `examples/modules/*.py` | **3 个合规模块**（配置热加载/健康检查/体测上报） |
| `examples/AGENTS_example.md` | **项目级规范示例**，新项目启动时改改直接用 |
| `EXPERIMENT_REPORT.md` | **对比实验报告 v1**，滑动窗口限流器实测 |
| `docs/EXPERIMENT_REPORT_v2.md` | **对比实验报告 v2**，3 模块 A/B 对照 + 监控数据 |

---

## 最速上手（3 分钟）

### 第一步：复制 Skill

打开 `code_bagu_skill.md`，全文复制。

### 第二步：粘贴到 Kimi Code

在 Kimi Code 的设置里，找到 **Skill / System Prompt**，粘贴进去。

### 第三步：开新项目时，根目录放 AGENTS.md

复制 `examples/AGENTS_example.md` 到你的项目根目录，改改项目名就能用。

### 第四步：让 AI 先出八股，不出代码

给 Kimi Code 的指令：

```
不要写实现。先按八股规范，输出完整框架：
破题、承题、起讲、入手、起股、中股、后股（正路径/降级路径）、束股（给出/留下）。
我检查结构通过后，你再填充实现。
```

---

## 黄金模板库（已验证）

| 模板 | 来源 | 验证状态 |
|------|------|---------|
| [跳绳检测算法](examples/golden_template_rope_skip.md) | 智慧体育项目 | ✅ 现场 ±0 精确命中 |
| [课件开发模板](examples/COURSE_TEMPLATE.py) | 智慧体育项目 | ✅ 生产环境运行 |
| [滑动窗口限流器](EXPERIMENT_REPORT.md) | 对比实验 | ✅ 代码审查效率提升 4-6 倍 |
| [配置热加载器](examples/modules/config_hot_reload.py) | 监控测试 | ✅ codebagu check 0 违规 |
| [健康检查器](examples/modules/health_checker.py) | 监控测试 | ✅ codebagu check 0 违规 |
| [体测数据上报](examples/modules/student_data_reporter.py) | 监控测试 | ✅ codebagu check 0 违规 |

**欢迎投稿你的黄金模板！** PR 请附"修改前改几遍 → 用八股后改几遍"的对比。

---

## 实验数据

### v2：3 模块 A/B 对照（2026-05-14）

| 指标 | 自由发挥（Claude） | 八股约束（DeepSeek） |
|------|-------------------|---------------------|
| Code Bagu 校验违规 | **34 个** | **0 个** |
| 健康检查器思维链 | 8000+ 字，死机 | 3.2 秒完成 |
| 写入拦截率 | N/A | 50% → 0%（收敛） |

完整报告见 [ARTICLE.md](ARTICLE.md) 和 [docs/EXPERIMENT_REPORT_v2.md](docs/EXPERIMENT_REPORT_v2.md)。

### v1：滑动窗口限流器

| 指标 | 普通编码 | 八股编码 |
|------|---------|---------|
| Bug 检索耗时（找异常处理） | ~30 秒 | ~5 秒 |
| 资源泄漏检查 | ~60 秒人工追踪 | ~15 秒对偶核对 |
| 代码审查效率 | 阅读理解 | 核对清单（提升 4-6 倍）|
| 隐性缺陷发现 | 4 处遗漏 | 全部显性化 |

完整报告见 [EXPERIMENT_REPORT.md](EXPERIMENT_REPORT.md)。

---

## 常见问题

**Q：注释这么多，代码会不会膨胀？**  
A：实际代码行只增加 9.8%，93% 的"膨胀"全是结构化注释——不执行，但提供认知导航。

**Q：国外模型能不能用？**  
A：能，但贵。1M 上下文烧不起，外行人玩不起。DeepSeek + Kimi 便宜量又足，配上八股，效果一样。

**Q：我自己不会写八股，怎么办？**  
A：你不用会写，只需要会**检查**。看 `后股` 里有没有 `✗ 降级路径`，没有就是漏了。比看懂代码简单 10 倍。

---

## 贡献

- 有黄金模板？发 PR
- 有改进建议？开 Issue
- 想讨论？知乎/B站搜"代码八股"

---

## 许可

MIT License — 拿去用，拿去改，拿去教别人。能拉一个人回来用国产 AI，就是贡献。

---

> *"我不是程序员，但我用 AI 做了 4 万行项目。"*  
> *— 本项目发起人，一个不懂代码的老板*
