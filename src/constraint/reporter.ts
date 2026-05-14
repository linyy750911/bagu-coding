import { EngineResult } from './types';

export class Reporter {
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
    }, null, 2);
  }
}
