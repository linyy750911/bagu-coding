#!/usr/bin/env node

/**
 * CodeBaguCLI — 命令行入口与路由调度 (index.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: process.argv / .env / .codebagu.yml
 *   输出: CLI 命令执行结果（check / init / chat）
 *   数据流向:
 *     process.argv → Commander.js 解析 → 子命令分发 → 执行对应 handler
 *     .env → 环境变量注入 → API key / model 配置
 *     .codebagu.yml → getConfig() → CodeBaguConfig → 各子命令
 *   修改风险点:
 *     ⚠️ 第6行: .env 文件泄露敏感信息（API key），需确保在 .gitignore 中
 *   最近修改:
 *     2026-05-15: 新增 getConfig 向上遍历目录树查找配置
 *     2026-05-15: chat 设为默认命令（isDefault: true）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：注册 CLI 子命令并分发到对应处理器；不做业务逻辑实现。
// 承题：依赖 Commander.js、config/loader、cli/* 模块。前置条件: Node.js 环境。
// [起讲] 约定式路由：check / init / chat 三个子命令，chat 为默认命令
// 入手：N/A

// ==== 起股 ====
// 取：process.argv、.env 文件、.codebagu.yml
// 验：Node.js 环境、文件系统可读写

// ==== 中股 ====
// 算：解析 .env → 注入环境变量
// 算：Commander.js 解析命令行参数
// 算：根据子命令分发到 check / init / chat handler

// ==== 后股 ====
// ✓ 正路径：命令解析成功 → 执行对应 handler → 输出结果 → 正常退出
// ✗ 降级路径：配置加载失败 → 报错退出
// ✗ 降级路径：handler 异常 → 捕获错误 → 打印错误信息 → 非零退出

// ==== 束股 ====
// 给出：process.exitCode（0 成功 / 1 失败）
// 留下：无持久副作用（纯 CLI 入口）
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';

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

// 破题：从指定目录向上遍历查找 .codebagu.yml；不做配置内容校验。
// 承题：依赖 fs.existsSync、path.join/path.dirname、loadConfigFromCwd。前置条件: cwd 为有效路径或省略。
// [起讲] 向上遍历目录树直到根目录，找到即加载；找不到则返回 DEFAULT_CONFIG
// 入手：N/A
async function getConfig(cwd?: string): Promise<CodeBaguConfig> {
  // ==== 起股 ====
  // 取：cwd（可选，默认 process.cwd()）
  // 验：cwd 为字符串或 undefined

  // ==== 中股 ====
  // 算：while 循环向上遍历目录树
  // 算：existsSync 检查 .codebagu.yml 存在性
  // 算：找到则 loadConfigFromCwd → 返回配置

  // ==== 后股 ====
  // ✓ 正路径：目录树中存在 .codebagu.yml → 加载并返回
  // ✗ 降级路径：遍历到根目录未找到 → 返回 DEFAULT_CONFIG

  // ==== 束股 ====
  // 给出：CodeBaguConfig
  // 留下：N/A

  let targetDir = cwd ? resolve(cwd) : process.cwd();
  while (true) {
    if (existsSync(join(targetDir, '.codebagu.yml'))) {
      return loadConfigFromCwd(targetDir);
    }
    const parent = dirname(targetDir);
    if (parent === targetDir) break;
    targetDir = parent;
  }
  return DEFAULT_CONFIG;
}

// 破题：chat 默认命令的入口包装器，加载配置后启动对话；不做命令行解析。
// 承题：依赖 getConfig、startChat。前置条件: Node.js 环境、可选 .env 已加载。
// [起讲] 捕获 startChat 异常，统一输出错误信息并非零退出
// 入手：N/A
async function defaultChat(options: { model?: string; apiKey?: string; skill?: string; workingDir?: string }) {
  // ==== 起股 ====
  // 取：options（model、apiKey、skill、workingDir）
  // 验：N/A

  // ==== 中股 ====
  // 算：await getConfig() → 加载配置
  // 算：await startChat(config, options) → 启动对话循环

  // ==== 后股 ====
  // ✓ 正路径：配置加载成功 → 对话正常启动 → 用户交互
  // ✗ 降级路径：配置加载失败或 startChat 异常 → 打印错误 → process.exit(1)

  // ==== 束股 ====
  // 给出：无（进程退出或对话循环阻塞）
  // 留下：N/A

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
      const configDir = statSync(path).isDirectory() ? path : dirname(path);
      const config = await getConfig(configDir);
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

program
  .command('chat', { isDefault: true })
  .description('对话式编程（默认模式）')
  .action(async () => {
    const opts = program.opts();
    await defaultChat({ model: opts.model, apiKey: opts.apiKey, skill: opts.skill, workingDir: process.cwd() });
  });

program.parse(process.argv);
