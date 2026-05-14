import { CodeBaguRule, RuleContext, RuleViolation } from '../types';

const SECTION_START = /^(#|\/\/)\s*====\s*(\S+)\s*====/;
const SECTION_END = /^(#|\/\/)\s*====\s*(\S+)\s*====/;
const VALID_EMPTY = /(N\/A|无需)$/;

export class EmptyBaguRule implements CodeBaguRule {
  id = 'empty_bagu';

  check(context: RuleContext): RuleViolation[] {
    const { source, filePath } = context;
    const violations: RuleViolation[] = [];
    const lines = source.split('\n');
    let currentSection: string | null = null;
    let sectionStartLine = 0;
    let hasContent = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(SECTION_START);

      if (match && !line.endsWith('=') && match[1] === match[2]) continue;

      if (match) {
        if (currentSection && !hasContent) {
          violations.push({
            ruleId: this.id, severity: 'warning',
            message: `[${filePath}:${sectionStartLine + 1}] 股 "${currentSection}" 标记后没有内容，需声明 N/A 或 无需`,
            line: sectionStartLine + 1,
          });
        }
        currentSection = match[2];
        sectionStartLine = i;
        hasContent = false;
        continue;
      }

      if (currentSection) {
        const nextMatch = line.match(SECTION_END);
        if (nextMatch && nextMatch[2] !== currentSection) {
          if (!hasContent) {
            violations.push({
              ruleId: this.id, severity: 'warning',
              message: `[${filePath}:${sectionStartLine + 1}] 股 "${currentSection}" 标记后没有内容，需声明 N/A 或 无需`,
              line: sectionStartLine + 1,
            });
          }
          currentSection = nextMatch[2];
          sectionStartLine = i;
          hasContent = false;
        } else if (line.startsWith('#') || line.startsWith('//')) {
          hasContent = true;
        } else if (line.length > 0) {
          hasContent = true;
        }
      }
    }

    if (currentSection && !hasContent) {
      violations.push({
        ruleId: this.id, severity: 'warning',
        message: `[${filePath}:${sectionStartLine + 1}] 股 "${currentSection}" 标记后没有内容，需声明 N/A 或 无需`,
        line: sectionStartLine + 1,
      });
    }

    return violations;
  }
}
