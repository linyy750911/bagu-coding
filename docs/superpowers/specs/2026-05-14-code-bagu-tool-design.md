# code_bagu 1.0 设计规格

> 一个强制 Code Bagu（代码八股）编码规范的 AI 编程 CLI 工具。
> 双层拦截——AI 生成时拒绝不合规代码 + pre-commit/CI 离线检查。
> MVP 语言 Python，MVP 模型 DeepSeek v4 pro。

---

## 1. 目标与约束

| 维度 | 决策 |
|------|------|
| 目标用户 | 团队协作，类似 ESLint 但针对注释结构 |
| 拦截层 | 双层：生成时同步拦截 + pre-commit/CI 离线检查 |
| 工具体态 | 独立 CLI（类似 opencode） |
| 语言支持 | MVP：Python；二期：JS/TS；三期：Go/Rust/Java |
| LLM 接入 | MVP：DeepSeek v4 pro；后续 adapter 多厂商 |

---

## 2. 整体架构（四层）

```
CLI 入口层     chat | check | init
                  │
Agent 循环层   工具调度引擎 | 上下文管理器 | 对话历史
                  │
Code Bagu      规则引擎（多语言）| 校验器（生成拦截）| Prompt 注入器
约束层（核心）     │
                  │
LLM 适配层     DeepSeek v4 pro (MVP) → 后续多厂商
```

**核心原则**：生成代码必须穿过约束层才能落地——不可绕过。

---

## 3. 约束层详解

### 3.1 规则引擎

语言无关的规则定义模型，每条规则 = 抽取器 + 验证器：

| 规则 | 抽取方式 | 验证逻辑 |
|------|---------|---------|
| 拓扑图头完整性 | 正则匹配 docstring | 5 个必含字段（模块名、输入、输出、风险点、最近修改） |
| 八股段落结构 | 正则匹配 `==== X股 ====` | 破题两句、起/中/后/束四股缺一不可 |
| 破题格式 | 正则匹配 `# 破题：` / `// 破题：` | 分号分隔两句，第二句以"不做"开头 |
| 对偶平衡 | 全文计数配对符号 | 🔒↔🔓 ✓↔✗ ↗↔↘ 数量相等 |
| 格式统一 | 全局扫描注释行 | 注释符号后必须有空格，股标记格式一致 |
| 空八股合法性 | 正则匹配空股声明 | 格式必须为 `<股名>：N/A` 或 `<股名>：无需` |

多语言适配：仅注释符号不同（Python `#`，JS/TS/Go/Java `//`），规则逻辑完全相同。

### 3.2 Prompt 注入器

**Pre-prompt**：在每次 LLM 请求的 system prompt 中强制注入：
- `code_bagu_skill.md` 全文
- 项目的 `AGENTS.md`
- `.codebagu.yml` 中的自定义规则

**Post-prompt**：LLM 返回后、write_file 操作前触发校验。

### 3.3 校验器（生成拦截）

```
LLM 返回 write_file 意图
       │
       ▼
  规则引擎逐条匹配
       │
   ┌───┴───┐
   │        │
  通过     不通过（带错误详情）
   │        │
   ▼        ├──▶ 自动反馈 LLM，要求修正（最多重试 3 次）
 写盘       │
            ├──▶ 3 次仍失败 → 拒绝 + 错误报告
```

---

## 4. CLI 子命令

```
codebagu
├── chat           对话式编程（主入口）
│   ├── --model    模型选择（当前仅 deepseek-v4-pro）
│   ├── --resume   恢复上次会话
│   └── --context  附加上下文文件/目录
│
├── check          离线检查（pre-commit / CI）
│   ├── --fix      自动修复可修复项
│   ├── --format   输出格式: text | json（二期: sarif）
│   └── --strict   严格模式，警告也报错
│
└── init           初始化项目
    ├── --lang     指定语言: python | multi
    └── 生成 .codebagu.yml + 规则目录
```

---

## 5. 项目配置

```yaml
# .codebagu.yml — codebagu init 自动生成
version: "1.0"
project: "<项目名>"

languages:
  - python

rules:
  tuopu_header: required
  bagu_paragraphs: required
  anti_duality: required
  empty_bagu: warn
  format_consistency: required

ci:
  strict: true
  format: json
```

---

## 6. 技术栈

| 层 | 选型 |
|----|------|
| CLI 框架 | Commander.js |
| AST 解析 | tree-sitter（多语言统一） |
| LLM 客户端 | fetch（DeepSeek 兼容 OpenAI 协议） |
| 测试 | Vitest |
| 语言 | TypeScript |
| 包管理 | pnpm |

---

## 7. 项目结构

```
code_bagu/
├── src/
│   ├── cli/
│   │   ├── index.ts           # 主命令路由
│   │   ├── chat.ts            # 对话式编程
│   │   ├── check.ts           # 离线检查
│   │   └── init.ts            # 项目初始化
│   ├── agent/
│   │   ├── loop.ts            # Agent 主循环
│   │   ├── tools.ts           # 工具定义（read/write/search/bash）
│   │   ├── context.ts         # 上下文管理
│   │   └── history.ts         # 对话历史持久化
│   ├── constraint/
│   │   ├── engine.ts          # 规则引擎主入口
│   │   ├── rules/
│   │   │   ├── topology.ts
│   │   │   ├── bagu.ts
│   │   │   ├── duality.ts
│   │   │   ├── format.ts
│   │   │   └── empty-bagu.ts
│   │   ├── validator.ts       # 生成时同步拦截
│   │   ├── prompt.ts          # system prompt 注入
│   │   └── reporter.ts        # 报告生成（text/json）
│   ├── llm/
│   │   ├── adapter.ts         # 适配器接口
│   │   ├── deepseek.ts        # DeepSeek v4 pro
│   │   └── types.ts
│   ├── parsers/
│   │   ├── base.ts
│   │   └── python.ts
│   └── config/
│       ├── loader.ts          # .codebagu.yml 加载
│       └── schema.ts          # 配置校验
├── tests/
├── docs/
└── package.json
```

---

## 8. 关键交互时序

```
用户输入 "写一个 WebSocket 连接管理器"
                    │
                    ▼
Agent Loop:
  1. 读取项目上下文（.codebagu.yml, AGENTS.md）
  2. 注入 system prompt（code_bagu_skill.md 全文 + 项目上下文）
  3. 调用 DeepSeek v4 pro
  4. LLM 返回 write_file 工具调用
  5. 校验器拦截 → 规则引擎逐条匹配
     ├── 不合规 → 反馈 LLM，附错误详情，要求修正（最多 3 次）
     └── 合规   → 执行 write_file，输出自检报告
```

---

## 9. MVP 范围裁切

| 功能 | MVP | 说明 |
|------|-----|------|
| `chat` 子命令 | ✅ | 核心对话式编程 |
| `check` 子命令 | ✅ | 离线检查（text/json） |
| `init` 子命令 | ✅ | 生成 .codebagu.yml |
| Python 支持 | ✅ | tree-sitter-python |
| JS/TS 支持 | ❌ | 二期 |
| DeepSeek v4 pro | ✅ | 唯一模型 |
| 重试机制 | ✅ | 最多 3 次 |
| sarif 输出 | ❌ | 二期 |
| 多模型适配 | ❌ | 二期 |

---

## 10. 风险与边界

- 对偶检查仅做**符号计数平衡**，不分析语义（例如 `open()` 是否真的对应 `close()`）
- 规则引擎依赖正则和 tree-sitter 语法树定位，不需要执行代码
- 空八股声明格式必须严格符合规范，否则被识别为缺失股
