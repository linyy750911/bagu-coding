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
        v.severity = toSeverity(severity);
        allViolations.push(v);
      }
    }

    const errors = allViolations.filter(v => v.severity === 'error');
    const passed = errors.length === 0;

    return {
      passed,
      violations: allViolations,
      filePath: context.filePath,
    };
  }
}
