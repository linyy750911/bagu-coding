#!/usr/bin/env node
import { Command } from 'commander';
import { runCheck, CheckOptions } from './cli/check';
import { loadConfigFromCwd } from './config/loader';

const program = new Command();

program
  .name('codebagu')
  .description('AI-first coding CLI with Code Bagu constraint enforcement')
  .version('1.0.0');

program
  .command('check <path>')
  .description('离线检查文件或目录的 Code Bagu 合规性')
  .option('-f, --format <format>', '输出格式: text | json', 'text')
  .option('--strict', '严格模式，警告也报错', false)
  .action(async (path: string, options: { format: string; strict: boolean }) => {
    try {
      const config = await loadConfigFromCwd();
      const output = runCheck(path, config, {
        format: options.format as CheckOptions['format'],
        strict: options.strict,
      });
      console.log(output);
      process.exit(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error:', message);
      process.exit(1);
    }
  });

program.parse(process.argv);
