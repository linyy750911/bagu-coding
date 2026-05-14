import { CodeBaguRule, RuleContext, RuleViolation } from '../types';

type PairMode = 'strict' | 'coverage';

interface DualityPair {
  open: string;
  close: string;
  label: string;
  mode: PairMode;
}

const PAIRS: DualityPair[] = [
  { open: '🔒', close: '🔓', label: '资源申请/释放', mode: 'strict' },
  { open: '✓', close: '✗', label: '正路径/降级路径', mode: 'coverage' },
  { open: '↗', close: '↘', label: '计数增/减', mode: 'strict' },
];

export class DualityRule implements CodeBaguRule {
  id = 'anti_duality';

  check(context: RuleContext): RuleViolation[] {
    const { source, filePath } = context;
    const violations: RuleViolation[] = [];
    // 只统计注释行内的对偶符号，避免字符串字面量误报
    const commentLines = source.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('#') || trimmed.startsWith('//');
    });
    const commentSource = commentLines.join('\n');

    for (const pair of PAIRS) {
      const openCount = (commentSource.match(new RegExp(escapeRegex(pair.open), 'g')) || []).length;
      const closeCount = (commentSource.match(new RegExp(escapeRegex(pair.close), 'g')) || []).length;

      if (pair.mode === 'strict') {
        if (openCount !== closeCount) {
          violations.push({
            ruleId: this.id,
            severity: 'error',
            message: `[${filePath}] 对偶不平衡 - ${pair.label}: ${pair.open}${openCount}个 ${pair.close}${closeCount}个（必须严格 1:1）`,
          });
        }
      } else if (pair.mode === 'coverage') {
        if (openCount === 0) {
          violations.push({
            ruleId: this.id,
            severity: 'error',
            message: `[${filePath}] 对偶不平衡 - ${pair.label}: 缺少 ${pair.open}（正路径），至少要有 1 个`,
          });
        } else if (closeCount === 0) {
          violations.push({
            ruleId: this.id,
            severity: 'error',
            message: `[${filePath}] 对偶不平衡 - ${pair.label}: 缺少 ${pair.close}（降级路径），至少要有 1 个`,
          });
        } else if (closeCount < openCount) {
          violations.push({
            ruleId: this.id,
            severity: 'error',
            message: `[${filePath}] 对偶不平衡 - ${pair.label}: ${pair.open}${openCount}个 ${pair.close}${closeCount}个（降级路径应不少于正路径）`,
          });
        }
      }
    }

    return violations;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
