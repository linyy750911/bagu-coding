import { describe, it, expect } from 'vitest';
import { GenerationValidator } from '../../src/constraint/validator';
import { ConstraintEngine } from '../../src/constraint/engine';
import { CodeBaguConfig } from '../../src/config/types';
import { TopoHeaderRule } from '../../src/constraint/rules/topology';
import { BaguParagraphsRule } from '../../src/constraint/rules/bagu';
import { DualityRule } from '../../src/constraint/rules/duality';
import { FormatRule } from '../../src/constraint/rules/format';
import { EmptyBaguRule } from '../../src/constraint/rules/empty-bagu';

const config: CodeBaguConfig = {
  version: '1.0', project: 'test', languages: ['python'],
  rules: {
    tuopu_header: 'required', bagu_paragraphs: 'required',
    anti_duality: 'required', empty_bagu: 'warn', format_consistency: 'required',
  },
  ci: { strict: true, format: 'text' },
};

function makeEngine(): ConstraintEngine {
  return new ConstraintEngine(config, [
    new TopoHeaderRule(), new BaguParagraphsRule(),
    new DualityRule(), new FormatRule(), new EmptyBaguRule(),
  ]);
}

const COMPLIANT_CODE = `"""
Test — desc (test.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: x
  输出: y → downstream
  数据流向:
    x → y
修改风险点:
  ⚠️ 第1行: test
最近修改:
  2026-05-14: init
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
# 破题：处理数据；不做验证。
# 承题：N/A。前置条件: N/A。
# [起讲] 简单处理
# 入手：N/A
def f():
    # ==== 起股 ====
    # 取：N/A
    # 验：N/A
    # ==== 中股 ====
    # 算：pass
    # 转：N/A
    # ==== 后股 ====
    # ✓ 正路径：ok
    # ✗ 降级路径：N/A
    # ==== 束股 ====
    # 给出：N/A
    # 留下：N/A
    pass
`;

describe('GenerationValidator', () => {
  it('should return valid for compliant code', () => {
    const validator = new GenerationValidator(makeEngine());
    const result = validator.validate('test.py', COMPLIANT_CODE);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should return invalid for noncompliant code', () => {
    const validator = new GenerationValidator(makeEngine());
    const result = validator.validate('test.py', 'print("no bagu")');
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
