#!/usr/bin/env node
import { Command } from 'commander';
import { runCheck, CheckOptions } from './cli/check';
import { startChat } from './cli/chat';
import { runInit } from './cli/init';
import { loadConfigFromCwd } from './config/loader';

const program = new Command();
program.name('codebagu').description('AI-first coding CLI with Code Bagu constraint enforcement').version('1.0.0');

program
  .command('check <path>')
  .description('离线检查文件或目录的 Code Bagu 合规性')
  .option('-f, --format <format>', '输出格式: text | json', 'text')
  .option('--strict', '严格模式，警告也报错', false)
  .action(async (path: string, options: { format: string; strict: boolean }) => {
    try {
      const config = await loadConfigFromCwd();
      const output = runCheck(path, config, { format: options.format as CheckOptions['format'], strict: options.strict });
      console.log(output);
      process.exit(0);
    } catch (err: unknown) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('chat')
  .description('对话式 AI 编程（Code Bagu 约束）')
  .option('-m, --model <model>', '模型名称', 'deepseek-chat')
  .option('-k, --api-key <key>', 'DeepSeek API Key')
  .option('-s, --skill <path>', 'code_bagu_skill.md 路径')
  .option('-w, --working-dir <path>', '工作目录')
  .action(async (options: { model: string; apiKey?: string; skill?: string; workingDir?: string }) => {
    try {
      const config = await loadConfigFromCwd();
      await startChat(config, { model: options.model, apiKey: options.apiKey, skillPath: options.skill, workingDir: options.workingDir });
    } catch (err: unknown) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('初始化项目，创建 .codebagu.yml')
  .option('-n, --name <name>', '项目名称', 'my-project')
  .action((options: { name: string }) => {
    const result = runInit(process.cwd(), options.name);
    console.log(result);
  });

program.parse(process.argv);
