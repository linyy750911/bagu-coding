/**
 * ConstraintEngine — 约束规则引擎 (engine.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: RuleContext（文件路径、源码、语言）
 *   输出: EngineResult（passed / violations）
 *   数据流向:
 *     RuleContext → 遍历规则列表 → 逐条 check → 收集 Violations → 判定 passed
 *   修改风险点:
 *     ⚠️ 第23行: severity 为 'off' 时规则被跳过，需确保调用方知悉
 *   最近修改:
 *     2026-05-15: 支持多语言，RuleContext 新增 language 字段
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：遍历所有约束规则，逐条检查源码合规性；不做 AST 解析或语义分析。
// 承题：依赖 CodeBaguRule 接口。前置条件: rules 和 config 已初始化。
// [起讲] 将配置 severity 映射为 ViolationSeverity，统一错误/警告判定标准
// 入手：N/A

// ==== 起股 ====
// 取：RuleContext（filePath, source, language）
// 验：config.rules 包含对应规则的 severity 配置

// ==== 中股 ====
// 算：遍历规则列表 → 调用 rule.check → 收集违规
// 算：按 severity 分级映射（required→error, warn→warning）
// 转：EngineResult 对象

// ==== 后股 ====
// ✓ 正路径：无 error 级违规 → passed = true
// ✗ 降级路径：存在 error 级违规 → passed = false

// ==== 束股 ====
// 给出：EngineResult（passed, violations, filePath）
// 留下：无副作用（纯计算，不修改外部状态）

import { CodeBaguConfig, RuleSeverity } from '../config/types';
import { CodeBaguRule, RuleContext, EngineResult, RuleViolation, ViolationSeverity } from './types';

// 破题：将配置中的 severity 字符串映射为 ViolationSeverity；不做配置校验。
// 承题：依赖 RuleSeverity、ViolationSeverity 类型定义。前置条件: severity 为有效字符串或 undefined。
// [起讲] required / undefined → error；其他 → warning
// 入手：N/A
function toSeverity(severity: RuleSeverity | undefined): ViolationSeverity {
  // ==== 起股 ====
  // 取：severity（RuleSeverity | undefined）
  // 验：N/A

  // ==== 中股 ====
  // 算：severity === 'required' || undefined → 'error'
  // 算：其他 → 'warning'

  // ==== 后股 ====
  // ✓ 正路径：required → error
  // ✓ 正路径：warn → warning
  // ✗ 降级路径：undefined → error（默认最严格）

  // ==== 束股 ====
  // 给出：ViolationSeverity
  // 留下：N/A

  if (severity === 'required' || severity === undefined) return 'error';
  return 'warning';
}

// 破题：对单个文件执行全量规则检查；不做增量或缓存。
// 承题：依赖 this.rules 和 this.config。前置条件: context 包含有效 source 和 language。
// [起讲] 逐个调用规则的 check 方法，按配置 severity 分级汇总
// 入手：N/A
export class ConstraintEngine {
  private rules: CodeBaguRule[];
  private config: CodeBaguConfig;

  constructor(config: CodeBaguConfig, rules: CodeBaguRule[]) {
    this.config = config;
    this.rules = rules;
  }

  // 破题：对单个文件执行全量规则检查，按 severity 分级汇总结果；不做增量或缓存。
  // 承题：依赖 this.rules、this.config、toSeverity。前置条件: context 包含有效 source 和 language。
  // [起讲] 遍历规则 → severity='off' 则跳过 → 调用 rule.check → 收集违规 → 分级映射 → 判定 passed
  // 入手：N/A
  evaluate(context: RuleContext): EngineResult {
    // ==== 起股 ====
    // 取：RuleContext（filePath, source, language）
    // 验：this.rules 和 this.config 已初始化

    // ==== 中股 ====
    // 算：遍历规则列表 → severity='off' 跳过
    // 算：rule.check(context) → 收集 violations
    // 算：toSeverity 映射 → 按 error/warning 分级
    // 转：allViolations → EngineResult

    // ==== 后股 ====
    // ✓ 正路径：无 error 级违规 → passed = true
    // ✗ 降级路径：存在 error 级违规 → passed = false
    // ✗ 降级路径：severity='off' → 规则静默跳过

    // ==== 束股 ====
    // 给出：EngineResult（passed, violations, filePath）
    // 留下：无副作用（纯计算，不修改外部状态）

    const allViolations: RuleViolation[] = [];

    for (const rule of this.rules) {
      const severity: RuleSeverity | undefined = this.config.rules[rule.id as keyof typeof this.config.rules];
      if (severity === 'off') continue;

      const violations = rule.check(context);
      for (const v of violations) {
        allViolations.push({ ...v, severity: toSeverity(severity) });
      }
    }

    const errors = allViolations.filter(v => v.severity === 'error');
    const passed = errors.length === 0;

    // 监控：每个规则的命中情况由调用方（AgentLoop）通过 violations 数组统计
    // Engine 本身只负责收集，不做聚合写入，避免循环依赖

    return {
      passed,
      violations: allViolations,
      filePath: context.filePath,
    };
  }
}
