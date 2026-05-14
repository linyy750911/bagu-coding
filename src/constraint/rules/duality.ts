import { CodeBaguRule, RuleContext, RuleViolation } from '../types';

interface DualityPair {
  open: string;
  close: string;
  label: string;
}

const PAIRS: DualityPair[] = [
  { open: '🔒', close: '🔓', label: '资源申请/释放' },
  { open: '✓', close: '✗', label: '正路径/降级路径' },
  { open: '↗', close: '↘', label: '计数增/减' },
];

export class DualityRule implements CodeBaguRule {
  id = 'anti_duality';

  check(context: RuleContext): RuleViolation[] {
    const { source, filePath } = context;
    const violations: RuleViolation[] = [];

    for (const pair of PAIRS) {
      const openCount = (source.match(new RegExp(escapeRegex(pair.open), 'g')) || []).length;
      const closeCount = (source.match(new RegExp(escapeRegex(pair.close), 'g')) || []).length;

      if (openCount !== closeCount) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}] 对偶不平衡 - ${pair.label}: ${pair.open}${openCount}个 ${pair.close}${closeCount}个`,
        });
      }
    }

    return violations;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
