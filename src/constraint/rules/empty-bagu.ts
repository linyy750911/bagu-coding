/**
 * EmptyBaguRule — 空八股段落检测规则 (empty-bagu.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: RuleContext（source, filePath, language）
 *   输出: RuleViolation[]（股标记后无内容）
 *   数据流向:
 *     source + language → 逐行扫描 → 匹配股标记 → 检查后续内容 → 空则 warning
 *   修改风险点:
 *     ⚠️ 第16行: 只检查同一行注释后的内容，跨行非注释代码可能误判
 *   最近修改:
 *     2026-05-15: 支持多语言行注释（# / // / --）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：检测八股股标记后是否有实质内容；不做内容质量评估。
// 承题：依赖 LanguageProfile 的 lineComment。前置条件: source 非空。
// [起讲] 空八股是形式主义的温床——标记存在但内容为空，比没有标记更具欺骗性
// 入手：N/A

// ==== 起股 ====
// 取：source、filePath、language
// 验：source 非空

// ==== 中股 ====
// 算：逐行扫描 → 匹配股标记正则
// 算：记录当前股 → 检查后续行是否有内容
// 算：遇到下一个股标记时，判断上一股是否为空

// ==== 后股 ====
// ✓ 正路径：所有股标记后都有内容 → 返回 []
// ✗ 降级路径：股标记后无内容 → warning
// ✗ 降级路径：文件末尾的股无内容 → warning

// ==== 束股 ====
// 给出：RuleViolation[]
// 留下：N/A

import { CodeBaguRule, RuleContext, RuleViolation } from '../types';
import { getProfile } from '../../config/languages';

export class EmptyBaguRule implements CodeBaguRule {
  id = 'empty_bagu';

  check(context: RuleContext): RuleViolation[] {
    // ==== 起股 ====
    // 取：context（source, filePath, language）
    // 验：source 非空

    const { source, filePath, language } = context;
    const profile = getProfile(language);
    const violations: RuleViolation[] = [];
    const lines = source.split('\n');

    // ==== 中股 ====
    // 算：逐行扫描 → 匹配股标记 → 检查内容

    const lc = escapeRegex(profile.lineComment);
    const sectionStart = new RegExp(`^${lc}\\s*====\\s*(\\S+)\\s*====`);

    let currentSection: string | null = null;
    let sectionStartLine = 0;
    let hasContent = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(sectionStart);

      if (match) {
        if (currentSection && !hasContent) {
          violations.push({
            ruleId: this.id, severity: 'warning',
            message: `[${filePath}:${sectionStartLine + 1}] 股 "${currentSection}" 标记后没有内容，需声明 N/A 或 无需`,
            line: sectionStartLine + 1,
          });
        }
        currentSection = match[1];
        sectionStartLine = i;
        hasContent = false;
        continue;
      }

      if (currentSection) {
        if ((line.startsWith(profile.lineComment)) || line.length > 0) {
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

    // ==== 后股 ====
    // ✓ 正路径：所有股标记后都有内容 → 返回 []
    // ✗ 降级路径：空股 → 已报 warning

    // ==== 束股 ====
    // 给出：RuleViolation[]
    // 留下：N/A

    return violations;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
