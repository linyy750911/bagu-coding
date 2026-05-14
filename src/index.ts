#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// 手动加载 .env，无任何输出
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split(/=(.*)/s);
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts[1].trim();
        if (key && !process.env[key]) process.env[key] = val;
      }
    }
  }
}

import { Command } from 'commander';
import { runCheck, CheckOptions, CheckResult } from './cli/check';
import { startChat } from './cli/chat';
import { runInit } from './cli/init';
import { loadConfigFromCwd } from './config/loader';
import { CodeBaguConfig } from './config/types';

const DEFAULT_CONFIG: CodeBaguConfig = {
  version: '1.0',
  project: '未命名项目',
  languages: ['python'],
  rules: {
    tuopu_header: 'required',
    bagu_paragraphs: 'required',
    anti_duality: 'required',
    empty_bagu: 'warn',
    format_consistency: 'required',
  },
  ci: { strict: true, format: 'text' },
};

async function getConfig(): Promise<CodeBaguConfig> {
  if (existsSync(join(process.cwd(), '.codebagu.yml'))) return loadConfigFromCwd(process.cwd());
  return DEFAULT_CONFIG;
}

async function defaultChat(options: { model?: string; apiKey?: string; skill?: string; workingDir?: string }) {
  try {
    const config = await getConfig();
    await startChat(config, options);
  } catch (err: unknown) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

const program = new Command();
program.name('codebagu').description('八股编程 CLI — 输入 codebagu 直接开始').version('1.0.0');

program
  .option('-m, --model <model>', '模型名称', process.env.CODEBAGU_MODEL || 'deepseek-chat')
  .option('-k, --api-key <key>', 'DeepSeek API Key')
  .option('-s, --skill <path>', 'code_bagu_skill.md 路径');

program
  .command('check <path>')
  .description('离线检查文件或目录的 Code Bagu 合规性')
  .option('-f, --format <format>', '输出格式: text | json', 'text')
  .option('--strict', '严格模式，警告也报错', false)
  .action(async (path: string, options: { format: string; strict: boolean }) => {
    try {
      const config = await getConfig();
      const result: CheckResult = runCheck(path, config, { format: options.format as CheckOptions['format'], strict: options.strict });
      console.log(result.output);
      process.exit(result.exitCode);
    } catch (err: unknown) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('初始化项目，创建 .codebagu.yml')
  .option('-n, --name <name>', '项目名称', '未命名项目')
  .action((options: { name: string }) => {
    const result = runInit(process.cwd(), options.name);
    console.log(result);
  });

program.action(() => {
  const opts = program.opts();
  defaultChat({ model: opts.model, apiKey: opts.apiKey, skill: opts.skill, workingDir: process.cwd() });
});

program.parse(process.argv);
