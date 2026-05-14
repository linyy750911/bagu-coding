import { describe, it, expect } from 'vitest';
import { DualityRule } from '../../../src/constraint/rules/duality';

const ctx = (code: string) => ({ filePath: 'test.py', source: code, language: 'python' });

describe('DualityRule', () => {
  const rule = new DualityRule();

  it('should pass when all duality pairs balance', () => {
    const code = `
# 🔒 open connection
# 🔓 close connection
# ✓ positive path
# ✗ negative path
# ↗ count += 1
# ↘ count -= 1
print("ok")
`;
    const violations = rule.check(ctx(code));
    expect(violations.filter(v => v.severity === 'error')).toHaveLength(0);
  });

  it('should fail when lock/unlock mismatch', () => {
    const code = `
# 🔒 open
# 🔒 open again
# 🔓 close
print("leak")
`;
    const violations = rule.check(ctx(code));
    expect(violations.some(v => v.message.includes('🔒'))).toBe(true);
  });

  it('should pass when negative paths outnumber positive paths', () => {
    const code = `
# ✓ path1
# ✗ path2
# ✗ path3
# ✗ path4
print("ok")
`;
    const violations = rule.check(ctx(code));
    expect(violations.filter(v => v.severity === 'error')).toHaveLength(0);
  });

  it('should fail when positive paths outnumber negative paths', () => {
    const code = `
# ✓ path1
# ✓ path2
# ✗ path3
print("imbalance")
`;
    const violations = rule.check(ctx(code));
    expect(violations.some(v => v.message.includes('✓'))).toBe(true);
  });

  it('should fail when missing positive path', () => {
    const code = `
# ✗ path1
# ✗ path2
print("missing positive")
`;
    const violations = rule.check(ctx(code));
    expect(violations.some(v => v.message.includes('✓'))).toBe(true);
  });

  it('should fail when missing negative path', () => {
    const code = `
# ✓ path1
# ✓ path2
print("missing negative")
`;
    const violations = rule.check(ctx(code));
    expect(violations.some(v => v.message.includes('✗'))).toBe(true);
  });

  it('should fail when increment/decrement mismatch', () => {
    const code = `
# ↗ up1
# ↗ up2
# ↘ down1
print("imbalance")
`;
    const violations = rule.check(ctx(code));
    expect(violations.some(v => v.message.includes('↗'))).toBe(true);
  });
});
