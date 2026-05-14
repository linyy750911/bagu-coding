import { readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { ConstraintEngine } from '../constraint/engine';
import { TopoHeaderRule } from '../constraint/rules/topology';
import { BaguParagraphsRule } from '../constraint/rules/bagu';
import { DualityRule } from '../constraint/rules/duality';
import { FormatRule } from '../constraint/rules/format';
import { EmptyBaguRule } from '../constraint/rules/empty-bagu';
import { Reporter } from '../constraint/reporter';
import { CodeBaguConfig } from '../config/types';

function createEngine(config: CodeBaguConfig): ConstraintEngine {
  return new ConstraintEngine(config, [
    new TopoHeaderRule(),
    new BaguParagraphsRule(),
    new DualityRule(),
    new FormatRule(),
    new EmptyBaguRule(),
  ]);
}

const IGNORED_DIRS = new Set(['node_modules', '__pycache__', '.git', 'venv', '.venv', 'dist', 'build']);

function collectFiles(inputPath: string): string[] {
  const stat = statSync(inputPath);
  if (stat.isFile()) return [inputPath];
  if (!stat.isDirectory()) throw new Error(`路径不存在: ${inputPath}`);

  const files: string[] = [];
  const entries = readdirSync(inputPath, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(inputPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full));
    } else if (entry.name.endsWith('.py')) {
      files.push(full);
    }
  }
  return files;
}

export interface CheckOptions {
  format: 'text' | 'json';
  strict: boolean;
}

export interface CheckResult {
  output: string;
  exitCode: number;
}

export function runCheck(inputPath: string, config: CodeBaguConfig, options: CheckOptions): CheckResult {
  const engine = createEngine(config);
  const reporter = new Reporter();
  const files = collectFiles(inputPath);
  const results: string[] = [];
  let hasErrors = false;

  for (const file of files) {
    const source = readFileSync(file, 'utf-8');
    const result = engine.evaluate({
      filePath: file,
      source,
      language: 'python',
    });

    if (options.format === 'json') {
      results.push(reporter.json(result));
    } else {
      results.push(reporter.text(result));
    }

    if (!result.passed) hasErrors = true;
    if (options.strict) {
      const warnings = result.violations.filter(v => v.severity === 'warning');
      if (warnings.length > 0) hasErrors = true;
    }
  }

  const exitCode = hasErrors ? 1 : 0;

  if (options.format === 'json') {
    const parsed = results.map(r => JSON.parse(r));
    const payload = parsed.length === 1 ? parsed[0] : parsed;
    return { output: JSON.stringify(payload, null, 2), exitCode };
  }

  return { output: results.join('\n\n'), exitCode };
}
