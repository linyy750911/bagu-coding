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
# ==== 起股 ====
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

  it('coverage: 无函数体（纯常量类），有 ✓ 无 ✗ 应通过', () => {
    const code = `
# 破题：定义常量；不做业务逻辑。
# ✓ 正路径：常量集中定义，各模块正常引用
# 无起股标记，无函数体
`;
    const violations = rule.check(ctx(code));
    expect(violations).toHaveLength(0);
  });

  it('coverage: 无函数体但缺少正路径，应失败', () => {
    const code = `
# 破题：定义常量；不做业务逻辑。
# 无正路径标记
`;
    const violations = rule.check(ctx(code));
    expect(violations.some(v => v.message.includes('✓'))).toBe(true);
  });
});
