import { describe, it, expect } from 'vitest';
import { ConstraintEngine } from '../../src/constraint/engine';
import { CodeBaguRule, RuleContext, RuleViolation } from '../../src/constraint/types';
import { CodeBaguConfig } from '../../src/config/types';

function makeConfig(overrides: Partial<CodeBaguConfig> = {}): CodeBaguConfig {
  return {
    version: '1.0',
    project: 'test',
    languages: ['python'],
    rules: {
      tuopu_header: 'required',
      bagu_paragraphs: 'required',
      anti_duality: 'required',
      empty_bagu: 'warn',
      format_consistency: 'required',
    },
    ci: { strict: true, format: 'text' },
    ...overrides,
  };
}

function makeContext(code: string): RuleContext {
  return { filePath: 'test.py', source: code, language: 'python' };
}

class AlwaysPassRule implements CodeBaguRule {
  readonly id = 'test-always-pass';
  check(): RuleViolation[] { return []; }
}

class AlwaysFailRule implements CodeBaguRule {
  readonly id = 'test-always-fail';
  check(): RuleViolation[] {
    return [{ ruleId: this.id, severity: 'error', message: 'always fails', line: 1 }];
  }
}

describe('ConstraintEngine', () => {
  it('should return empty violations when all rules pass', () => {
    const engine = new ConstraintEngine(makeConfig(), [new AlwaysPassRule()]);
    const result = engine.evaluate(makeContext('print("hello")'));
    expect(result.violations).toHaveLength(0);
    expect(result.passed).toBe(true);
  });

  it('should collect violations when rules fail', () => {
    const engine = new ConstraintEngine(makeConfig(), [new AlwaysFailRule()]);
    const result = engine.evaluate(makeContext('print("hello")'));
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleId).toBe('test-always-fail');
    expect(result.passed).toBe(false);
  });

  it('should treat warn as non-blocking', () => {
    const config = makeConfig();
    config.rules.empty_bagu = 'warn';
    class WarnRule implements CodeBaguRule {
      readonly id = 'empty_bagu';
      check(): RuleViolation[] {
        return [{ ruleId: 'empty_bagu', severity: 'warning', message: 'empty', line: 1 }];
      }
    }
    const engine = new ConstraintEngine(config, [new WarnRule()]);
    const result = engine.evaluate(makeContext('x=1'));
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].severity).toBe('warning');
    expect(result.passed).toBe(true);
  });

  it('should skip rule when config severity is off', () => {
    const config = makeConfig();
    config.rules.tuopu_header = 'off';
    let called = false;
    class SpyRule implements CodeBaguRule {
      readonly id = 'tuopu_header';
      check(): RuleViolation[] { called = true; return []; }
    }
    const engine = new ConstraintEngine(config, [new SpyRule()]);
    engine.evaluate(makeContext('x=1'));
    expect(called).toBe(false);
  });
});
