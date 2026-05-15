/**
 * MetricsReporter — 会话监控报告生成器 (metrics.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: SessionMetrics / filePath
 *   输出: JSON 报告字符串 / 文本摘要字符串
 *   数据流向:
 *     SessionMetrics → 计算统计指标 → generateReport() → 写入 JSON 文件
 *     SessionMetrics → textSummary() → 格式化文本 → 终端输出
 *   修改风险点:
 *     ⚠️ 第32行: mkdirSync recursive 可能创建意外目录
 *     ⚠️ 第40行: 除以零保护（writeAttempts 为 0 时 passRate 返回 0.0）
 *   最近修改:
 *     2026-05-14: 新增 SessionMetrics 监控埋点系统
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：将对话会话的监控数据格式化为 JSON 报告或文本摘要；不做实时采集。
// 承题：依赖 SessionMetrics、fs、path。前置条件: metrics 已完整记录。
// [起讲] 监控是八股约束效果的量化证明——拦截率、重试次数、规则命中分布一目了然
// 入手：N/A

// ==== 起股 ====
// 取：SessionMetrics、filePath（可选）
// 验：metrics 非空

// ==== 中股 ====
// 算：计算会话时长、写入通过率、规则违规分布
// 算：生成结构化 JSON 报告
// 算：格式化文本摘要（终端友好）

// ==== 后股 ====
// ✓ 正路径：数据完整 → 生成报告成功
// ✗ 降级路径：目录不存在 → mkdirSync 自动创建
// ✗ 降级路径：磁盘空间不足 → 抛出异常（上游处理）

// ==== 束股 ====
// 给出：string（JSON 或文本摘要）
// 留下：JSON 文件（如指定 filePath）

import { SessionMetrics } from './loop';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class MetricsReporter {
  static generateReport(metrics: SessionMetrics, filePath: string): string {
    // ==== 起股 ====
    // 取：metrics、filePath
    // 验：metrics 非空

    const duration = Date.now() - metrics.startTime;
    const passRate = metrics.writeAttempts > 0
      ? ((metrics.writeAttempts - metrics.writeBlocked) / metrics.writeAttempts * 100).toFixed(1)
      : '0.0';

    // ==== 中股 ====
    // 算：构建报告对象 → JSON 序列化 → 写入文件

    const report = {
      session: {
        duration_ms: duration,
        total_rounds: metrics.totalRounds,
        tool_calls: metrics.toolCalls,
      },
      write_file: {
        attempts: metrics.writeAttempts,
        blocked: metrics.writeBlocked,
        pass_rate: `${passRate}%`,
        retries: metrics.retryCount,
      },
      rule_violations: metrics.ruleViolations,
      latency: {
        last_round_ms: metrics.lastRoundLatency,
      },
    };

    const json = JSON.stringify(report, null, 2);
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, json, 'utf-8');

    // ==== 后股 ====
    // ✓ 正路径：报告生成并写入成功

    // ==== 束股 ====
    // 给出：string（JSON 字符串）
    // 留下：文件系统写入

    return json;
  }

  static textSummary(metrics: SessionMetrics): string {
    // ==== 起股 ====
    // 取：metrics
    // 验：metrics 非空

    const duration = ((Date.now() - metrics.startTime) / 1000).toFixed(1);
    const passRate = metrics.writeAttempts > 0
      ? ((metrics.writeAttempts - metrics.writeBlocked) / metrics.writeAttempts * 100).toFixed(1)
      : '0.0';

    // ==== 中股 ====
    // 算：格式化文本摘要

    // ==== 束股 ====
    // 给出：string（终端友好文本）
    // 留下：N/A

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Code Bagu 会话监控报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
会话时长: ${duration}s
对话轮数: ${metrics.totalRounds}
工具调用: ${metrics.toolCalls} 次
写入尝试: ${metrics.writeAttempts} 次
  └─ 拦截: ${metrics.writeBlocked} 次（通过率 ${passRate}%）
  └─ 重试: ${metrics.retryCount} 次

规则拦截分布:
${Object.entries(metrics.ruleViolations).map(([k, v]) => `  ${k}: ${v} 次`).join('\n') || '  无'}

最后一轮延迟: ${metrics.lastRoundLatency}ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }
}
