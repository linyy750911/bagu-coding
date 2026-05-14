import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('codebagu check', () => {
  it('should pass for compliant file', () => {
    const output = execSync(
      'tsx src/index.ts check tests/fixtures/compliant.py --format json',
      { encoding: 'utf-8', cwd: process.cwd() }
    );
    const result = JSON.parse(output);
    expect(result.passed).toBe(true);
  });

  it('should fail for noncompliant file', () => {
    let output: string;
    try {
      output = execSync(
        'tsx src/index.ts check tests/fixtures/noncompliant.py --format json --strict',
        { encoding: 'utf-8', cwd: process.cwd() }
      );
    } catch (err: unknown) {
      output = (err as { stdout?: string }).stdout || '';
    }
    const result = JSON.parse(output);
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
