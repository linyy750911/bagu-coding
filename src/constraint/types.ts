/**
 * ===================================================================
 * 模块名:        constraint/types.ts
 * 输入输出:      无运行时输入，导出约束系统核心类型
 * 数据流向:      类型定义 → engine.ts / rules/*.ts / reporter.ts / validator.ts
 * 修改风险点:    修改 RuleViolation 字段会影响所有规则、Reporter 输出和测试断言
 * 最近修改:      2026-05-15 — 初始定义
 * ===================================================================
 */

// 破题：本模块不做业务判定，只做约束引擎的契约定义。
// 承题：RuleContext 封装文件路径、源码文本和语言标识，供各规则统一消费；
//       RuleViolation 是引擎与 Reporter 之间的通用数据结构，字段增减需全链路同步。
// [起讲] CodeBaguRule 接口的 check() 方法约定返回 RuleViolation[]，
//       空数组表示"通过"，非空数组表示"违规"。
// 入手：ViolationSeverity 限定 'error' | 'warning'，与 RuleSeverity 的映射在 engine.ts 中完成。

// ==== 起股 ====
// 取：RuleContext、RuleViolation、CodeBaguRule、EngineResult 四个核心接口。
// 验：TypeScript 编译期检查，无运行时逻辑。
// ==== 中股 ====
// 算：line / column 为可选字段，兼容无法定位行号的规则；
//     EngineResult 聚合单文件的通过状态与全部违规列表。
// 转：类型契约驱动 engine.ts 的遍历与聚合逻辑。
// ==== 后股 ====
// ✓ 正路径：类型定义完整 → 引擎与规则可独立开发 → 编译期发现接口不匹配
// ✗ 降级路径：字段类型错误 → 编译报错 → 阻止运行时异常
// ✗ 降级路径：接口变更未同步 → 类型检查失败 → 强制更新所有实现
// ==== 束股 ====
// 给出：导出四个接口，覆盖上下文、违规、规则、结果四个维度。
// 留下：未来如需支持建议修复（fix），可在 RuleViolation 中追加 suggestions 字段。

export interface RuleContext {
  filePath: string;
  source: string;
  language: string;
}

export type ViolationSeverity = 'error' | 'warning';

export interface RuleViolation {
  ruleId: string;
  severity: ViolationSeverity;
  message: string;
  line?: number;
  column?: number;
}

export interface CodeBaguRule {
  id: string;
  check(context: RuleContext): RuleViolation[];
}

export interface EngineResult {
  passed: boolean;
  violations: RuleViolation[];
  filePath: string;
}
