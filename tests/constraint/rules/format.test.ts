import { describe, it, expect } from 'vitest';
import { FormatRule } from '../../../src/constraint/rules/format';

const ctx = (code: string) => ({ filePath: 'test.py', source: code, language: 'python' });

describe('FormatRule', () => {
  const rule = new FormatRule();

  it('should pass for correct comment format', () => {
    const code = `
# 破题：xxx；不做yyy。
# ==== 起股 ====
print("ok")
`;
    expect(rule.check(ctx(code))).toHaveLength(0);
  });

  it('should fail when comment missing space after #', () => {
    const code = `
#破题：xxx；不做yyy。
print("ok")
`;
    const violations = rule.check(ctx(code));
    expect(violations.length).toBeGreaterThan(0);
  });

  it('should fail when bagu marker has wrong format', () => {
    const code = `
# 破题：xxx；不做yyy。
# ---- 起股 ----
print("ok")
`;
    const violations = rule.check(ctx(code));
    expect(violations.some(v => v.message.includes('股标记'))).toBe(true);
  });

  it('should fail when using // comments in Python', () => {
    const code = `
// 破题：xxx；不做yyy。
print("ok")
`;
    const violations = rule.check(ctx(code));
    expect(violations.length).toBeGreaterThan(0);
  });
});
