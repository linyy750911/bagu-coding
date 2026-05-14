# Code Bagu（代码八股）

> **我们用监控数据证明：国产模型 + 八股约束，生成稳定性碾压自由发挥。**
>
> 一份 8000 字思维链死机现场 vs 3.2 秒完成的对照实验报告 → [ARTICLE.md](./ARTICLE.md)

---

## 快速开始

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

## 核心特性

- **八股约束引擎**：拓扑图头、八股段落、对偶符号（🔒/🔓 ✓/✗ ↗/↘）自动校验
- **监控埋点**：`SessionMetrics` 自动记录对话轮数、写入拦截、规则命中分布
- **自动报告**：会话结束时输出 `textSummary` 并保存 JSON 到 `.codebagu/session-report.json`
- **DeepSeek v4-pro 深度集成**：支持 `reasoning_content` 提取与约束反馈

## 实验验证

3 个真实业务模块的 A/B 对照实验：

| 指标 | 自由发挥（Claude） | 八股约束（DeepSeek） |
|------|-------------------|---------------------|
| 校验违规 | **34 个** | **0 个** |
| 健康检查器耗时 | 8000+ 字思维链，死机 | 3.2 秒完成 |

详细报告见 [ARTICLE.md](./ARTICLE.md) 和 [docs/EXPERIMENT_REPORT_v2.md](./docs/EXPERIMENT_REPORT_v2.md)。

## 项目结构

```
code_bagu/
├── src/                 # 核心源码（约束引擎、Agent 循环、CLI）
├── tests/               # 测试用例（50 个，全部通过）
├── examples/modules/    # 3 个合规模块（config/health/student）
├── docs/                # 实验报告、思维链记录
└── ARTICLE.md           # 核心传播文章
```

## License

MIT
