import { CodeBaguRule, RuleContext, RuleViolation } from '../types';

const BAGU_SECTIONS = ['起股', '中股', '后股', '束股'];
const BAGU_MARKER = /^[ \t]*#\s*====\s*(\S+)\s*====/;
const POTI_REGEX = /#\s*破题[：:]\s*(.+)/;
const CHENGTI_REGEX = /#\s*承题[：:]/;
const QIJIANG_REGEX = /#\s*\[起讲\]/;
const RUSHOU_REGEX = /#\s*入手[：:]/;

export class BaguParagraphsRule implements CodeBaguRule {
  id = 'bagu_paragraphs';

  check(context: RuleContext): RuleViolation[] {
    const { source, filePath } = context;
    const violations: RuleViolation[] = [];
    const lines = source.split('\n');

    const hasFunction = /def\s+\w+\s*\(/.test(source);
    if (!hasFunction) return violations;

    const potiMatch = source.match(POTI_REGEX);
    if (!potiMatch) {
      violations.push({
        ruleId: this.id, severity: 'error',
        message: `[${filePath}] 缺少破题（# 破题：做什么；不做什么。）`, line: 1,
      });
    } else {
      const potiContent = potiMatch[1].trim();
      const parts = potiContent.split(/[；;]/);
      if (parts.length < 2) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 破题必须用分号分隔两句（做什么；不做什么）`, line: 1,
        });
      } else if (!parts[1].trim().startsWith('不做')) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 破题第二句必须以"不做"开头，当前: "${parts[1].trim()}"`, line: 1,
        });
      }
    }

    if (!CHENGTI_REGEX.test(source)) {
      violations.push({
        ruleId: this.id, severity: 'error',
        message: `[${filePath}] 缺少承题（# 承题：依赖声明。前置条件。）`, line: 1,
      });
    }

    if (!QIJIANG_REGEX.test(source)) {
      violations.push({
        ruleId: this.id, severity: 'error',
        message: `[${filePath}] 缺少起讲（# [起讲] 设计意图）`, line: 1,
      });
    }

    if (!RUSHOU_REGEX.test(source)) {
      violations.push({
        ruleId: this.id, severity: 'error',
        message: `[${filePath}] 缺少入手（# 入手：资源申请）`, line: 1,
      });
    }

    const foundBaguSections: string[] = [];
    for (const line of lines) {
      const match = line.match(BAGU_MARKER);
      if (match) foundBaguSections.push(match[1]);
    }

    for (const section of BAGU_SECTIONS) {
      if (!foundBaguSections.includes(section)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 缺少八股段落: ==== ${section} ====`, line: 1,
        });
      }
    }

    const houGuSection = this.extractSection(source, '后股');
    if (houGuSection) {
      if (!/正路径/.test(houGuSection) && !/✓/.test(houGuSection)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 后股缺少正路径标记（✓ 正路径）`,
        });
      }
      if (!/降级路径/.test(houGuSection) && !/✗/.test(houGuSection)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 后股缺少降级路径标记（✗ 降级路径）`,
        });
      }
    }

    const shuGuSection = this.extractSection(source, '束股');
    if (shuGuSection) {
      if (!/给出/.test(shuGuSection)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 束股缺少"给出"（返回值）`,
        });
      }
      if (!/留下/.test(shuGuSection)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 束股缺少"留下"（副作用）`,
        });
      }
    }

    return violations;
  }

  private extractSection(source: string, sectionName: string): string | null {
    const startRegex = new RegExp(`^[ \\t]*#\\s*====\\s*${sectionName}\\s*====`);
    const endRegex = /^[ \t]*#\s*====\s*\S+\s*====/;
    const lines = source.split('\n');
    let inSection = false;
    const sectionLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (startRegex.test(lines[i])) { inSection = true; continue; }
      if (inSection && endRegex.test(lines[i])) break;
      if (inSection) sectionLines.push(lines[i]);
    }

    return sectionLines.length > 0 ? sectionLines.join('\n') : null;
  }
}
