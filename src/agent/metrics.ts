import { SessionMetrics } from './loop';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class MetricsReporter {
  static generateReport(metrics: SessionMetrics, filePath: string): string {
    const duration = Date.now() - metrics.startTime;
    const passRate = metrics.writeAttempts > 0
      ? ((metrics.writeAttempts - metrics.writeBlocked) / metrics.writeAttempts * 100).toFixed(1)
      : '0.0';

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
    return json;
  }

  static textSummary(metrics: SessionMetrics): string {
    const duration = ((Date.now() - metrics.startTime) / 1000).toFixed(1);
    const passRate = metrics.writeAttempts > 0
      ? ((metrics.writeAttempts - metrics.writeBlocked) / metrics.writeAttempts * 100).toFixed(1)
      : '0.0';

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
