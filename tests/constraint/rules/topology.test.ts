import { describe, it, expect } from 'vitest';
import { TopoHeaderRule } from '../../../src/constraint/rules/topology';

const ctx = (code: string) => ({ filePath: 'test.py', source: code, language: 'python' });

const COMPLIANT = `"""
TestModule — does things (test.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: data
  输出: result → downstream

  数据流向:
    data → process → result

修改风险点:
  ⚠️ 第10行: something breaks

最近修改:
  2026-05-14: initial
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

print("hello")
`;

describe('TopoHeaderRule', () => {
  const rule = new TopoHeaderRule();

  it('should pass for complete topology header', () => {
    const violations = rule.check(ctx(COMPLIANT));
    expect(violations).toHaveLength(0);
  });

  it('should fail when docstring is missing', () => {
    const violations = rule.check(ctx('print("no header")'));
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].message).toContain('拓扑图头');
  });

  it('should fail when missing required fields', () => {
    const partial = `"""
TestModule — desc (test.py)
━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: data
━━━━━━━━━━━━━━━━━━━━━━━━
"""
print("ok")
`;
    const violations = rule.check(ctx(partial));
    expect(violations.length).toBeGreaterThan(0);
  });
});
