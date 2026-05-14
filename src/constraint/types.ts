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
