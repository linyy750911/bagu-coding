import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'tests/fixtures/e2e-project');
const CLI_ENTRY = join(process.cwd(), 'src/index.ts');

function runCli(args: string): string {
  try {
    return execSync(`tsx ${CLI_ENTRY} ${args}`, { encoding: 'utf-8', cwd: TEST_DIR });
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer })?.stderr;
    return stderr?.toString() || String(err);
  }
}

describe('codebagu end-to-end', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('init → check compliant → check noncompliant', () => {
    const initOut = runCli('init --name e2e-test');
    expect(initOut).toContain('.codebagu.yml');

    const configExists = existsSync(join(TEST_DIR, '.codebagu.yml'));
    expect(configExists).toBe(true);

    writeFileSync(join(TEST_DIR, 'bad.py'), 'def f(): return 1');
    const checkBad = runCli('check bad.py --format json --strict');
    const jsonMatch = checkBad.match(/\{[^]*\}/);
    expect(jsonMatch).not.toBeNull();
    const result = JSON.parse(jsonMatch![0]);
    expect(result.passed).toBe(false);

    const compliantContent = `"""
Test — test file (test.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: x
  输出: y → z
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
# [起讲] test
# 入手：N/A
def f():
    # ==== 起股 ====
    # 取：N/A
    # 验：N/A
    # ==== 中股 ====
    # 算：N/A
    # 转：N/A
    # ==== 后股 ====
    # ✓ 正路径：ok
    # ✗ 降级路径：N/A
    # ==== 束股 ====
    # 给出：N/A
    # 留下：N/A
    pass
`;
    writeFileSync(join(TEST_DIR, 'good.py'), compliantContent);
    const checkGood = runCli('check good.py --format json');
    const goodMatch = checkGood.match(/\{[^]*\}/);
    const goodResult = JSON.parse(goodMatch![0]);
    expect(goodResult.passed).toBe(true);
  });
});
