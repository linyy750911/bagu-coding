import { describe, it, expect } from 'vitest';
import { BaguParagraphsRule } from '../../../src/constraint/rules/bagu';

const ctx = (code: string) => ({ filePath: 'test.py', source: code, language: 'python' });

const FULL_BAGU = `
# 破题：获取用户订单列表；不做分页逻辑。
# 承题：依赖 db.query。前置条件: db 已连接。
# [起讲] 使用连接池复用连接避免频繁创建
# 入手：🔒 从连接池获取连接
def get_orders():
    # ==== 起股 ====
    # 取：从参数获取 user_id
    # 验：验证 user_id 为正整数

    # ==== 中股 ====
    # 算：查询 orders 表
    # 转：转换为 dict 列表

    # ==== 后股 ====
    # ✓ 正路径：返回订单列表
    # ✗ 降级路径：返回空列表并记录日志

    # ==== 束股 ====
    # 给出：List[dict] 订单列表
    # 留下：N/A
    pass
`;

describe('BaguParagraphsRule', () => {
  const rule = new BaguParagraphsRule();

  it('should pass for complete bagu structure', () => {
    const violations = rule.check(ctx(FULL_BAGU));
    expect(violations).toHaveLength(0);
  });

  it('should fail when missing poti (破题)', () => {
    const noPoti = FULL_BAGU.replace(/# 破题：/, '# po题：');
    const violations = rule.check(ctx(noPoti));
    expect(violations.length).toBeGreaterThan(0);
  });

  it('should fail when missing any bagu section marker', () => {
    const missingHou = FULL_BAGU.replace(/# ==== 后股 ====/, '# ==== hou股 ====');
    const violations = rule.check(ctx(missingHou));
    expect(violations.length).toBeGreaterThan(0);
  });

  it('should fail when poti does not have semicolon separation', () => {
    const badPoti = FULL_BAGU.replace('# 破题：获取用户订单列表；不做分页逻辑。', '# 破题：获取用户订单列表。');
    const violations = rule.check(ctx(badPoti));
    expect(violations.length).toBeGreaterThan(0);
  });

  it('should fail when second poti clause does not start with 不做', () => {
    const badPoti2 = FULL_BAGU.replace('不做分页逻辑', '也不做分页');
    const violations = rule.check(ctx(badPoti2));
    expect(violations.length).toBeGreaterThan(0);
  });
});
