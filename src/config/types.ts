/**
 * ===================================================================
 * 模块名:        config/types.ts
 * 输入输出:      无运行时输入，导出类型定义供全项目使用
 * 数据流向:      类型定义 → schema.ts / engine.ts / 各规则文件 / CLI 模块
 * 修改风险点:    新增配置字段时需同步更新 schema.ts 校验逻辑与 loader 默认值
 * 最近修改:      2026-05-15 — 新增 ci 配置类型（strict / format）
 * ===================================================================
 */

// 破题：本模块不做运行时逻辑，只做领域模型的类型契约。
// 承题：CodeBaguConfig 是贯穿 CLI → 引擎 → 规则的核心数据结构，
//       任何字段变更都会级联影响 schema 校验、loader 解析和 CLI 传参。
// [起讲] RuleSeverity 四档设计兼顾强制性与灵活性：required 阻断 CI，warn 仅提示。
// 入手：所有接口均为顶层导出，便于各模块按需引用，避免循环依赖。

// ==== 起股 ====
// 取：Severity 枚举与 CodeBaguRules / CodeBaguConfig 接口定义。
// 验：TypeScript 编译期静态检查，无需运行时验证。
// ==== 中股 ====
// 算：ci.format 限定 'text' | 'json'，保证 Reporter 输出分支穷尽；
//     ci.strict 布尔值控制进程退出码（strict=true 时 warning 也导致非零退出）。
// 转：类型定义作为 schema.ts 的返回类型契约，确保解析结果可追踪。
// ==== 后股 ====
// ✓ 正路径：类型定义完整 → 编译通过 → 全链路类型安全
// ✗ 降级路径：字段缺失 → 编译报错 → 开发阶段拦截
// ✗ 降级路径：类型不兼容 → IDE 提示 → 重构前发现
// ==== 束股 ====
// 给出：导出 RuleSeverity、CodeBaguRules、CodeBaguConfig 三种类型。
// 留下：未来扩展 ci 字段时，优先在此追加可选属性，保持向后兼容。

export type RuleSeverity = 'required' | 'optional' | 'warn' | 'off';

export interface CodeBaguRules {
  tuopu_header: RuleSeverity;
  bagu_paragraphs: RuleSeverity;
  anti_duality: RuleSeverity;
  empty_bagu: RuleSeverity;
  format_consistency: RuleSeverity;
}

export interface CodeBaguConfig {
  version: string;
  project: string;
  languages: string[];
  rules: CodeBaguRules;
  ci: {
    strict: boolean;
    format: 'text' | 'json';
  };
}
