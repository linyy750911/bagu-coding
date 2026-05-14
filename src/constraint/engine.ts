import { CodeBaguConfig, RuleSeverity } from '../config/types';
import { CodeBaguRule, RuleContext, EngineResult, RuleViolation, ViolationSeverity } from './types';

function toSeverity(severity: RuleSeverity | undefined): ViolationSeverity {
  if (severity === 'required' || severity === undefined) return 'error';
  return 'warning';
}

export class ConstraintEngine {
  private rules: CodeBaguRule[];
  private config: CodeBaguConfig;

  constructor(config: CodeBaguConfig, rules: CodeBaguRule[]) {
    this.config = config;
    this.rules = rules;
  }

  evaluate(context: RuleContext): EngineResult {
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
