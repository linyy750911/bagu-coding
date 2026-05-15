/**
 * DualityRule — 对偶标记平衡检测规则 (duality.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: RuleContext（source, filePath, language）
 *   输出: RuleViolation[]（对偶符号不平衡）
 *   数据流向:
 *     source + language → 提取注释行 → 统计 🔒/🔓 ✓/✗ ↗/↘ → 检查平衡性
 *   修改风险点:
 *     ⚠️ 第28行: 块注释检测可能误判跨行情况
 *   最近修改:
 *     2026-05-15: 支持多语言注释提取（行注释 + 块注释）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：检测注释中对偶标记的数量是否平衡；不做代码逻辑分析。
// 承题：依赖 LanguageProfile 的 lineComment 和 blockComment。前置条件: source 非空。
// [起讲] 对偶检查是隐性缺陷的显化器——资源泄漏、路径遗漏、计数错误都通过对偶符号暴露
// 入手：N/A

// ==== 起股 ====
// 取：source、filePath、language
// 验：source 非空

// ==== 中股 ====
// 算：提取所有注释行（行注释 + 块注释内容）
// 算：统计 🔒/🔓（strict 模式必须 1:1）
// 算：统计 ✓/✗（coverage 模式正路径≥1、降级路径≥正路径）
// 算：统计 ↗/↘（strict 模式必须 1:1）

// ==== 后股 ====
// ✓ 正路径：所有对偶标记平衡 → 返回 []
// ✗ 降级路径：🔒/🔓 不平衡 → 报错
// ✗ 降级路径：✓/✗ 缺失或不平衡 → 报错
// ✗ 降级路径：↗/↘ 不平衡 → 报错

// ==== 束股 ====
// 给出：RuleViolation[]
// 留下：N/A

import { CodeBaguRule, RuleContext, RuleViolation } from '../types';
import { getProfile } from '../../config/languages';

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
    // ==== 起股 ====
    // 取：context（source, filePath, language）
    // 验：source 非空

    const { source, filePath, language } = context;
    const profile = getProfile(language);
    const violations: RuleViolation[] = [];

    // ==== 中股 ====
    // 算：提取注释行 → 统计对偶标记 → 检查平衡性

    // 收集注释行：行注释 + 块注释
    const commentLines: string[] = [];
    const lines = source.split('\n');
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (profile.blockComment) {
        const startIdx = trimmed.indexOf(profile.blockComment.start);
        const endIdx = trimmed.indexOf(profile.blockComment.end);
        if (startIdx !== -1 && (endIdx === -1 || startIdx < endIdx)) {
          inBlockComment = true;
        }
        if (endIdx !== -1) {
          inBlockComment = false;
          commentLines.push(trimmed);
          continue;
        }
      }

      if (inBlockComment) {
        commentLines.push(trimmed);
      } else if (trimmed.startsWith(profile.lineComment)) {
        commentLines.push(trimmed);
      }
    }

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

    // ==== 后股 ====
    // ✓ 正路径：所有对偶标记平衡 → 返回 []
    // ✗ 降级路径：对偶不平衡 → 已报错

    // ==== 束股 ====
    // 给出：RuleViolation[]
    // 留下：N/A

    return violations;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
