import { CodeBaguRule, RuleContext, RuleViolation } from '../types';

const REQUIRED_FIELDS = ['输入', '输出', '数据流向', '修改风险点', '最近修改'];

export class TopoHeaderRule implements CodeBaguRule {
  id = 'tuopu_header';

  check(context: RuleContext): RuleViolation[] {
    const { source, filePath } = context;
    const violations: RuleViolation[] = [];

    const docstringMatch = source.match(/"""/);
    if (!docstringMatch) {
      violations.push({
        ruleId: this.id,
        severity: 'error',
        message: `[${filePath}] 缺少拓扑图头（文件顶部 docstring）`,
        line: 1,
      });
      return violations;
    }

    const headerContent = source.slice(0, source.indexOf('"""', 3) + 3).toLowerCase();

    for (const field of REQUIRED_FIELDS) {
      if (!headerContent.includes(field.toLowerCase())) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}] 拓扑图头缺少必填字段: "${field}"`,
          line: 1,
        });
      }
    }

    return violations;
  }
}
