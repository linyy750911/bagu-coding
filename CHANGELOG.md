# Changelog

## [1.0.0] - 2026-05-14

### Added
- 发布 EXPERIMENT_REPORT_v2.0 — OpenCode 8000 字思维链死机 vs 八股约束 3.2 秒完成对比实验
- 完成 `config_hot_reload.py` / `health_checker.py` / `student_data_reporter.py` 三模块监控实验
- 新增 `SessionMetrics` 监控埋点系统（`src/agent/loop.ts` + `src/agent/metrics.ts`）
- CLI 退出时自动生成监控报告到 `.codebagu/session-report.json`
- `ARTICLE.md` — 核心传播文章（8 章节：死机现场 / 对照数据 / 语义递归陷阱 / 八股原理 / 监控方案）

### Fixed
- `anti_duality` 对偶规则修复：`✓/✗` 从 strict 模式改为 coverage 模式（降级路径可多于正路径）
- `🔒/🔓` 和 `↗/↘` 保持 strict 模式（资源申请/释放、计数增减必须 1:1）

## [0.2.0] - 2026-05-13

### Added
- `code_bagu` CLI 工具 v1.0.0 完成（18 任务全量实现）
- DeepSeek v4-pro 适配层接入（支持 `reasoning_content` 提取与约束反馈）
- 约束引擎：`ConstraintEngine` + `GenerationValidator` + `PromptInjector`
- 规则集合：`tuopu_header` / `bagu_paragraphs` / `anti_duality` / `format_consistency` / `empty_bagu`

## [0.1.0] - 2026-05-11

### Added
- 初始版本发布
- `code_bagu_skill.md` — AI 优先版 Skill 本体，三层递归结构（文件级/函数级/块级）
- `USAGE_GUIDE.md` — 外行人手把手教程，从零到双引擎流水线
- `EXPERIMENT_REPORT.md` — 滑动窗口限流器对比实验报告（普通编码 vs 八股编码）
- `examples/AGENTS_example.md` — 项目级规范模板
- `examples/golden_template_rope_skip.md` — 跳绳检测黄金模板（智慧体育项目验证，±0 精确命中）
- `examples/COURSE_TEMPLATE.py` — 课件开发模板（生产环境运行）
- 知乎文章：一个不懂代码的老板怎么让 AI 少改 10 遍 bug
