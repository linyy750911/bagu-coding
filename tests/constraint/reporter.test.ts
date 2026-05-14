import { describe, it, expect } from 'vitest';
import { Reporter } from '../../src/constraint/reporter';
import { EngineResult, RuleViolation } from '../../src/constraint/types';

function makeResult(violations: RuleViolation[]): EngineResult {
  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations,
    filePath: 'test.py',
  };
}

describe('Reporter', () => {
  const reporter = new Reporter();

  it('should output clean text when no violations', () => {
    const output = reporter.text(makeResult([]));
    expect(output).toContain('通过');
    expect(output).toContain('test.py');
  });

  it('should output violations with details in text mode', () => {
    const result = makeResult([
      { ruleId: 'test', severity: 'error', message: 'bad thing', line: 5 },
    ]);
    const output = reporter.text(result);
    expect(output).toContain('bad thing');
    expect(output).toContain('✗');
  });

  it('should output valid JSON in json mode', () => {
    const result = makeResult([
      { ruleId: 'r1', severity: 'error', message: 'm1', line: 1 },
      { ruleId: 'r2', severity: 'warning', message: 'm2', line: 3 },
    ]);
    const output = reporter.json(result);
    const parsed = JSON.parse(output);
    expect(parsed.file).toBe('test.py');
    expect(parsed.violations).toHaveLength(2);
    expect(parsed.passed).toBe(false);
  });
});
