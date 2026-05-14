import { CodeBaguRule, RuleContext, RuleViolation } from '../types';

const BAGU_MARKER_REGEX = /^(#|\/\/)\s*[-=]{1,8}\s*\S+\s*[-=]{1,8}/;
const CORRECT_MARKER_REGEX = /^(#|\/\/)\s====\s(起股|中股|后股|束股)\s====$/;
const COMMENT_LINE_REGEX = /^(#|\/\/)\S/;

export class FormatRule implements CodeBaguRule {
  id = 'format_consistency';

  check(context: RuleContext): RuleViolation[] {
    const { source, filePath } = context;
    const violations: RuleViolation[] = [];
    const lines = source.split('\n');
    const commentChar = context.language === 'python' ? '#' : '//';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const isJsComment = /^\s*\/\/\s/.test(line) || /^\s*\/\/[\u4e00-\u9fa5]/.test(line);
      if (isJsComment && commentChar === '#') {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}:${i + 1}] Python 文件不能使用 // 注释，请使用 #`,
          line: i + 1,
        });
        continue;
      }

      if (COMMENT_LINE_REGEX.test(line)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}:${i + 1}] 注释符号后必须有空格: "${line.slice(0, 20)}..."`,
          line: i + 1,
        });
        continue;
      }

      if (BAGU_MARKER_REGEX.test(line) && !CORRECT_MARKER_REGEX.test(line)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}:${i + 1}] 股标记格式不正确，应为: "${commentChar} ==== X股 ===="`,
          line: i + 1,
        });
      }
    }

    return violations;
  }
}
