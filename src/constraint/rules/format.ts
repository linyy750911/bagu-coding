/**
 * FormatRule — 注释格式与八股标记格式检测规则 (format.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: RuleContext（source, filePath, language）
 *   输出: RuleViolation[]（注释格式错误、股标记格式错误）
 *   数据流向:
 *     source + language → 逐行检查 → 注释符号后空格 / 错误注释风格 / 股标记格式
 *   修改风险点:
 *     ⚠️ 第18行: 误用注释风格检测可能误判字符串字面量中的注释
 *   最近修改:
 *     2026-05-15: 支持多语言注释符号（# / // / --）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：检测注释格式是否符合规范；不做内容语义检查。
// 承题：依赖 LanguageProfile 的 lineComment。前置条件: source 非空。
// [起讲] 格式铁律是八股规范的"语法层"——注释符号后必须有空格、股标记必须严格对齐
// 入手：N/A

// ==== 起股 ====
// 取：source、filePath、language
// 验：source 非空

// ==== 中股 ====
// 算：逐行扫描 source
// 算：检测注释符号后无空格（如 #foo）
// 算：检测错误注释风格（Python 中用了 //）
// 算：检测股标记格式不正确（如 # === 起股 ===）

// ==== 后股 ====
// ✓ 正路径：所有格式合规 → 返回 []
// ✗ 降级路径：注释符号后无空格 → 报错
// ✗ 降级路径：错误注释风格 → 报错
// ✗ 降级路径：股标记格式错误 → 报错

// ==== 束股 ====
// 给出：RuleViolation[]
// 留下：N/A

import { CodeBaguRule, RuleContext, RuleViolation } from '../types';
import { getProfile } from '../../config/languages';

export class FormatRule implements CodeBaguRule {
  id = 'format_consistency';

  check(context: RuleContext): RuleViolation[] {
    // ==== 起股 ====
    // 取：context（source, filePath, language）
    // 验：source 非空

    const { source, filePath, language } = context;
    const profile = getProfile(language);
    const violations: RuleViolation[] = [];
    const lines = source.split('\n');
    const commentChar = profile.lineComment;

    // ==== 中股 ====
    // 算：逐行扫描 → 检测格式违规

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // 检测是否使用了错误的注释风格（例如 Python 里用了 //）
      if (commentChar !== '//') {
        const isJsComment = /^\s*\/\/\s/.test(line) || /^\s*\/\/[\u4e00-\u9fa5]/.test(line);
        if (isJsComment) {
          violations.push({
            ruleId: this.id, severity: 'error',
            message: `[${filePath}:${i + 1}] ${profile.name} 文件不能使用 // 注释，请使用 ${commentChar}`,
            line: i + 1,
          });
          continue;
        }
      }

      // 检测注释符号后没有空格：如 `#foo` 或 `//foo`
      const commentRegex = new RegExp(`^\\s*${escapeRegex(commentChar)}\\S`);
      if (commentRegex.test(line)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}:${i + 1}] 注释符号后必须有空格: "${line.slice(0, 20)}..."`,
          line: i + 1,
        });
        continue;
      }

      // 检测八股标记格式
      const baguMarkerRegex = new RegExp(`^\\s*${escapeRegex(commentChar)}\\s*[-=]{1,8}\\s*\\S+\\s*[-=]{1,8}`);
      const correctMarkerRegex = new RegExp(`^\\s*${escapeRegex(commentChar)}\\s====\\s(起股|中股|后股|束股)\\s====$`);
      if (baguMarkerRegex.test(line) && !correctMarkerRegex.test(line)) {
        violations.push({
          ruleId: this.id, severity: 'error',
          message: `[${filePath}:${i + 1}] 股标记格式不正确，应为: "${commentChar} ==== X股 ===="`,
          line: i + 1,
        });
      }
    }

    // ==== 后股 ====
    // ✓ 正路径：所有格式合规 → 返回 []
    // ✗ 降级路径：格式违规 → 已报错

    // ==== 束股 ====
    // 给出：RuleViolation[]
    // 留下：N/A

    return violations;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
