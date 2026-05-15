/**
 * TopoHeaderRule — 拓扑图头检测规则 (topology.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: RuleContext（source, filePath, language）
 *   输出: RuleViolation[]（拓扑图头缺失或字段不全）
 *   数据流向:
 *     source + language → getProfile → topologyStrategy → extractHeader → 检查必填字段
 *   修改风险点:
 *     ⚠️ 第14行: extractHeader 只取第一个匹配的文档头，多个文档头时可能漏检
 *   最近修改:
 *     2026-05-15: 支持多语言文档头策略（docstring/docblock/prefixLines）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：检测文件顶部是否包含完整的拓扑图头（5 个必填字段）；不做内容语义分析。
// 承题：依赖 LanguageProfile 的 topologyStrategy。前置条件: language 已识别。
// [起讲] 根据语言类型选择文档头提取策略，统一检查输入/输出/数据流向/风险点/修改记录
// 入手：N/A

// ==== 起股 ====
// 取：source、filePath、language
// 验：source 非空、language 有效

// ==== 中股 ====
// 算：getProfile(language) → 获取 topologyStrategy
// 算：extractHeader(source, strategy) → 提取文档头内容
// 算：检查 5 个必填字段是否齐全

// ==== 后股 ====
// ✓ 正路径：文档头完整 → 无违规
// ✗ 降级路径：缺少文档头 → 报错
// ✗ 降级路径：缺少必填字段 → 逐条报错

// ==== 束股 ====
// 给出：RuleViolation[]
// 留下：N/A

import { CodeBaguRule, RuleContext, RuleViolation } from '../types';
import { getProfile } from '../../config/languages';

const REQUIRED_FIELDS = ['输入', '输出', '数据流向', '修改风险点', '最近修改'];

export class TopoHeaderRule implements CodeBaguRule {
  id = 'tuopu_header';

  check(context: RuleContext): RuleViolation[] {
    // ==== 起股 ====
    // 取：context（source, filePath, language）
    // 验：source 非空

    const { source, filePath, language } = context;
    const violations: RuleViolation[] = [];
    const profile = getProfile(language);

    // ==== 中股 ====
    // 算：getProfile → extractHeader → 检查必填字段

    const headerContent = this.extractHeader(source, profile.topologyStrategy);

    // ==== 后股 ====
    // ✓ 正路径：文档头完整 → 返回 []
    // ✗ 降级路径：文档头缺失 → 返回 error
    // ✗ 降级路径：字段缺失 → 返回 errors

    // ==== 束股 ====
    // 给出：RuleViolation[]
    // 留下：N/A

    if (headerContent === null) {
      violations.push({
        ruleId: this.id,
        severity: 'error',
        message: `[${filePath}] 缺少拓扑图头（文件顶部文档注释）`,
        line: 1,
      });
      return violations;
    }

    const lowerContent = headerContent.toLowerCase();

    for (const field of REQUIRED_FIELDS) {
      if (!lowerContent.includes(field.toLowerCase())) {
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

  private extractHeader(source: string, strategy: ReturnType<typeof getProfile>['topologyStrategy']): string | null {
    if (strategy.type === 'docstring') {
      const regex = new RegExp(`${escapeRegex(strategy.start)}(.*?)${escapeRegex(strategy.end)}`, 's');
      const match = source.match(regex);
      return match ? match[1] : null;
    }

    if (strategy.type === 'docblock') {
      const startIdx = source.indexOf(strategy.start);
      if (startIdx === -1) return null;
      const endIdx = source.indexOf(strategy.end, startIdx + strategy.start.length);
      if (endIdx === -1) return null;
      return source.slice(startIdx + strategy.start.length, endIdx);
    }

    if (strategy.type === 'prefixLines') {
      const lines = source.split('\n');
      const headerLines: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') continue;
        if (trimmed.startsWith(strategy.prefix)) {
          headerLines.push(trimmed.slice(strategy.prefix.length).trimStart());
        } else {
          break;
        }
      }
      return headerLines.length > 0 ? headerLines.join('\n') : null;
    }

    return null;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
