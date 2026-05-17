/**
 * BaguParagraphsRule — 八股段落完整性检测规则 (bagu.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: RuleContext（source, filePath, language）
 *   输出: RuleViolation[]（破题/承题/起讲/入手/股标记缺失）
 *   最近修改:
 *     2026-05-15: 支持多语言行注释（# / // / --）
 *     2026-05-15: 支持置信度前缀 [人工]/[推断]/[模板]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：检测函数级八股注释的完整性（含置信度前缀）；不做代码逻辑正确性检查。
// 承题：依赖 LanguageProfile 的 lineComment 和 functionPattern。前置条件: source 非空。
// [起讲] 八股规范的核心 enforcement——没有完整八股框架的函数必须被拦截
// 入手：N/A

// ==== 起股 ====
// 取：source、filePath、language
// 验：source 非空、lineComment 有效

// ==== 中股 ====
// 算：functionPattern.test(source) → 判断是否需要检查
// 算：正则匹配破题（含可选置信度前缀）/承题/起讲/入手/股标记
// 算：提取后股/束股内容 → 检查正路径/降级路径/给出/留下

// ==== 后股 ====
// ✓ 正路径：无函数 → 跳过检查 → 返回 []
// ✓ 正路径：八股完整 → 返回 []
// ✗ 降级路径：缺少破题/承题/起讲/入手 → 报错
// ✗ 降级路径：缺少股标记 → 报错
// ✗ 降级路径：后股/束股内容缺失 → 报错

// ==== 束股 ====
// 给出：RuleViolation[]
// 留下：N/A

import { CodeBaguRule, RuleContext, RuleViolation } from '../types';
import { getProfile } from '../../config/languages';

const BAGU_SECTIONS = ['起股', '中股', '后股', '束股'];

export class BaguParagraphsRule implements CodeBaguRule {
  id = 'bagu_paragraphs';

  check(context: RuleContext): RuleViolation[] {
    // ==== 起股 ====
    // 取：context（source, filePath, language）
    // 验：source 非空

    const { source, filePath, language } = context;
    const profile = getProfile(language);
    const violations: RuleViolation[] = [];
    const lines = source.split('\n');

    // ==== 中股 ====
    // 算：functionPattern 检测 → 破题/承题/起讲/入手匹配 → 股标记匹配 → 后股/束股内容检查

    const hasFunction = profile.functionPattern.test(source);
    if (!hasFunction) return violations;

    const lc = escapeRegex(profile.lineComment);
    const potiRegex = new RegExp(`${lc}\\s*(?:\\[(人工|推断|模板)\\]\\s+)?破题[：:]\\s*(.+)`);
    const chengTiRegex = new RegExp(`${lc}\\s*承题[：:]`);
    const qiJiangRegex = new RegExp(`${lc}\\s*\\[起讲\\]`);
    const ruShouRegex = new RegExp(`${lc}\\s*入手[：:]`);
    const baguMarker = new RegExp(`^[ \\t]*${lc}\\s*====\\s*(\\S+)\\s*====`);

    const potiMatch = source.match(potiRegex);
    if (!potiMatch) {
      violations.push({
        ruleId: this.id, severity: 'error',
        message: `[${filePath}] 缺少破题（${profile.lineComment} 破题：做什么；不做什么。）`, line: 1,
      });
    } else {
      const potiLine = this.lineOf(source, potiMatch.index ?? 0);
      const potiContent = potiMatch[2].trim();
      const parts = potiContent.split(/[；;]/);
      if (parts.length < 2) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 破题必须用分号分隔两句（做什么；不做什么）`, line: potiLine,
        });
      } else if (!parts[1].trim().startsWith('不做')) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 破题第二句必须以"不做"开头，当前: "${parts[1].trim()}"`, line: potiLine,
        });
      }
    }

    if (!chengTiRegex.test(source)) {
      violations.push({
        ruleId: this.id, severity: 'error',
        message: `[${filePath}] 缺少承题（${profile.lineComment} 承题：依赖声明。前置条件。）`, line: 1,
      });
    }

    if (!qiJiangRegex.test(source)) {
      violations.push({
        ruleId: this.id, severity: 'error',
        message: `[${filePath}] 缺少起讲（${profile.lineComment} [起讲] 设计意图）`, line: 1,
      });
    }

    if (!ruShouRegex.test(source)) {
      violations.push({
        ruleId: this.id, severity: 'error',
        message: `[${filePath}] 缺少入手（${profile.lineComment} 入手：资源申请）`, line: 1,
      });
    }

    const foundBaguSections: string[] = [];
    for (const line of lines) {
      const match = line.match(baguMarker);
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

    const houGu = this.extractSection(source, '后股', profile.lineComment);
    if (houGu.content) {
      if (!/正路径/.test(houGu.content) && !/✓/.test(houGu.content)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 后股缺少正路径标记（✓ 正路径）`,
          line: houGu.startLine,
        });
      }
      if (!/降级路径/.test(houGu.content) && !/✗/.test(houGu.content)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 后股缺少降级路径标记（✗ 降级路径）`,
          line: houGu.startLine,
        });
      }
    }

    const shuGu = this.extractSection(source, '束股', profile.lineComment);
    if (shuGu.content) {
      if (!/给出/.test(shuGu.content)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 束股缺少"给出"（返回值）`,
          line: shuGu.startLine,
        });
      }
      if (!/留下/.test(shuGu.content)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}] 束股缺少"留下"（副作用）`,
          line: shuGu.startLine,
        });
      }
    }

    // ==== 后股 ====
    // ✓ 正路径：八股完整 → 返回 []
    // ✗ 降级路径：缺少破题/承题/起讲/入手 → 已报错
    // ✗ 降级路径：缺少股标记 → 已报错
    // ✗ 降级路径：后股/束股内容缺失 → 已报错

    // ==== 束股 ====
    // 给出：RuleViolation[]
    // 留下：N/A

    return violations;
  }

  private lineOf(source: string, index: number): number {
    return source.slice(0, index).split('\n').length;
  }

  private extractSection(source: string, sectionName: string, lineComment: string): { content: string | null; startLine: number } {
    const lc = escapeRegex(lineComment);
    const startRegex = new RegExp(`^[ \\t]*${lc}\\s*====\\s*${sectionName}\\s*====`);
    const endRegex = new RegExp(`^[ \\t]*${lc}\\s*====\\s*\\S+\\s*====`);
    const lines = source.split('\n');
    let inSection = false;
    const sectionLines: string[] = [];
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      if (startRegex.test(lines[i])) { inSection = true; startLine = i + 1; continue; }
      if (inSection && endRegex.test(lines[i])) break;
      if (inSection) sectionLines.push(lines[i]);
    }

    return sectionLines.length > 0
      ? { content: sectionLines.join('\n'), startLine }
      : { content: null, startLine };
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
