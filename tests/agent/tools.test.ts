import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentToolExecutor } from '../../src/agent/tools';
import { GenerationValidator } from '../../src/constraint/validator';
import { ConstraintEngine } from '../../src/constraint/engine';
import { TopoHeaderRule } from '../../src/constraint/rules/topology';
import { BaguParagraphsRule } from '../../src/constraint/rules/bagu';
import { DualityRule } from '../../src/constraint/rules/duality';
import { FormatRule } from '../../src/constraint/rules/format';
import { EmptyBaguRule } from '../../src/constraint/rules/empty-bagu';
import { CodeBaguConfig } from '../../src/config/types';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const config: CodeBaguConfig = {
  version: '1.0', project: 'test', languages: ['python'],
  rules: {
    tuopu_header: 'required', bagu_paragraphs: 'required',
    anti_duality: 'required', empty_bagu: 'warn', format_consistency: 'required',
  },
  ci: { strict: true, format: 'text' },
};

describe('AgentToolExecutor', () => {
  const testDir = join(process.cwd(), 'tests/fixtures/tmp');

  beforeEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'hello.py'), 'print("hello")');
  });

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
  });

  it('should read a file', async () => {
    const executor = new AgentToolExecutor(testDir);
    const result = await executor.execute('read_file', { path: 'hello.py' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('hello');
  });

  it('should write a file', async () => {
    const executor = new AgentToolExecutor(testDir);
    const result = await executor.execute('write_file', { path: 'new.py', content: '# test\nprint("new")' });
    expect(result.success).toBe(true);
  });

  it('should list files in directory', async () => {
    const executor = new AgentToolExecutor(testDir);
    const result = await executor.execute('list_files', { path: '.' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('hello.py');
  });

  it('should block noncompliant write when validator is set', async () => {
    const engine = new ConstraintEngine(config, [
      new TopoHeaderRule(), new BaguParagraphsRule(),
      new DualityRule(), new FormatRule(), new EmptyBaguRule(),
    ]);
    const validator = new GenerationValidator(engine);
    const executor = new AgentToolExecutor(testDir, validator);
    const result = await executor.execute('write_file', { path: 'bad.py', content: 'print("no bagu")' });
    expect(result.success).toBe(false);
    expect(result.validationError).toBeDefined();
  });
});
