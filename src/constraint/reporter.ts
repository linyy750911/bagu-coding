/**
 * ===================================================================
 * 模块名:        constraint/reporter.ts
 * 输入输出:      EngineResult → 格式化字符串（text / json）
 * 数据流向:      引擎评估结果 → Reporter.text()/.json() → CLI stdout / CI 管道
 * 修改风险点:    修改输出格式会影响 CI 解析和测试断言，需同步更新快照
 * 最近修改:      2026-05-15 — 修复 reporter.ts 排序与文件名显示
 * ===================================================================
 */

import { EngineResult } from './types';

// 破题：本模块不做规则判定，只做评估结果的可视化渲染。
// 承题：text 模式面向终端用户，json 模式面向 CI 和自动化脚本，
//       两者共用同一 EngineResult 输入，保证输出一致性。
// [起讲] 图标与 severity 映射固定：✅/❌ 表通过状态，✗/⚠ 表 error/warning。
// 入手：text() 按行拼装数组再 join，避免字符串拼接的 O(n²) 开销。

export class Reporter {
  // ==== 起股 ====
  // 取：单个文件的 EngineResult（filePath / passed / violations[]）。
  // 验：violations 数组可能为空，此时只输出文件级汇总行。
  // ==== 中股 ====
  // 算：遍历 violations，根据 severity 选择前缀符号，拼接行号与消息；
  //     文件级汇总行包含通过状态图标和问题计数。
  // 转：将结构化结果转译为人类可读的终端文本。
  // ==== 后股 ====
  // ✓ 正路径：无违规 → 输出 "✅ 文件 — 通过 (0 个问题)"
  // ✗ 降级路径：有违规 → 逐条输出违规详情
  // ==== 束股 ====
  // 给出：返回单字符串，可直接 console.log。
  // 留下：未来扩展 SARIF / HTML 格式时，可新增方法而无需改动引擎。
  text(result: EngineResult): string {
    const lines: string[] = [];
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? '通过' : '不合规';
    const count = `(${result.violations.length} 个问题)`;

    lines.push(`${icon} ${result.filePath} — ${status} ${count}`);

    for (const v of result.violations) {
      const prefix = v.severity === 'error' ? '✗' : '⚠';
      const loc = v.line ? `:${v.line}` : '';
      lines.push(`  ${prefix} [${v.ruleId}${loc}] ${v.message}`);
    }

    return lines.join('\n');
  }

  // ==== 起股 ====
  // 取：与 text() 同源输入 —— EngineResult。
  // 验：确保 violations 数组中的每条记录都被序列化。
  // ==== 中股 ====
  // 算：将 violations 映射为包含 rule / severity / message / line / column 的对象数组；
  //     外层包裹 file / passed / violations 三字段。
  // 转：调用 JSON.stringify 生成 JSON Lines 格式中单行输出。
  // ==== 后股 ====
  // ✓ 正路径：结果完整 → 生成合法 JSON
  // ✗ 降级路径：字段异常 → JSON.stringify 自动处理 undefined
  // ==== 束股 ====
  // 给出：返回单行 JSON 字符串，供 --format json 模式逐行输出。
  // 留下：JSON 结构保持扁平，便于 jq / ndjson 工具链解析。
  json(result: EngineResult): string {
    return JSON.stringify({
      file: result.filePath,
      passed: result.passed,
      violations: result.violations.map(v => ({
        rule: v.ruleId,
        severity: v.severity,
        message: v.message,
        line: v.line,
        column: v.column,
      })),
    });
  }
}
