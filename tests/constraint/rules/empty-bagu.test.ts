import { describe, it, expect } from 'vitest';
import { EmptyBaguRule } from '../../../src/constraint/rules/empty-bagu';

const ctx = (code: string) => ({ filePath: 'test.py', source: code, language: 'python' });

describe('EmptyBaguRule', () => {
  const rule = new EmptyBaguRule();

  it('should pass when empty bagu uses valid format', () => {
    const code = `
# ==== 起股 ====
# 取：N/A
# 验：N/A
print("ok")
`;
    expect(rule.check(ctx(code))).toHaveLength(0);
  });

  it('should pass with 无需 format', () => {
    const code = `
# ==== 起股 ====
# 取：无需
print("ok")
`;
    expect(rule.check(ctx(code))).toHaveLength(0);
  });

  it('should warn on suspicious empty bagu (just marker, no content)', () => {
    const code = `
# ==== 起股 ====
# ==== 中股 ====
print("ok")
`;
    const violations = rule.check(ctx(code));
    expect(violations.length).toBeGreaterThan(0);
  });
});
