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

function collectFiles(inputPath: string): string[] {
  const stat = statSync(inputPath);
  if (stat.isFile()) return [inputPath];
  if (!stat.isDirectory()) throw new Error(`路径不存在: ${inputPath}`);

  const files: string[] = [];
  const entries = readdirSync(inputPath, { withFileTypes: true });
  for (const entry of entries) {
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

export function runCheck(inputPath: string, config: CodeBaguConfig, options: CheckOptions): string {
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

    if (!result.passed && options.strict) hasErrors = true;
    if (options.strict) {
      const warnings = result.violations.filter(v => v.severity === 'warning');
      if (warnings.length > 0) hasErrors = true;
    }
  }

  if (options.format === 'json') {
    return results.join('\n');
  }

  return results.join('\n\n');
}
