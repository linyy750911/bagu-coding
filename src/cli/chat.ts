/**
 * ChatMode — 交互式对话启动与终端界面 (chat.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: CodeBaguConfig / model / apiKey / skill / workingDir
 *   输出: 终端交互会话（用户输入 → AI 回复）
 *   数据流向:
 *     config + options → 初始化 AgentLoop → 构建 banner → readline 循环
 *     用户输入 → AgentLoop.sendMessage() → AI 回复 → 终端输出
 *     /quit → 退出 → 生成 SessionMetrics 报告
 *   修改风险点:
 *     ⚠️ 第24行: API key 从环境变量读取，可能为空导致启动失败
 *     ⚠️ 第80行: alternate screen buffer 切换后，SIGINT 需恢复终端状态
 *   最近修改:
 *     2026-05-15: 新增 alternate screen buffer 沉浸式体验
 *     2026-05-15: 多语言 banner 显示语言名
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：启动交互式 AI 编程对话，管理终端输入输出与沉浸式界面；不做 LLM 模型选择。
// 承题：依赖 AgentLoop、readline、ConstraintEngine。前置条件: API key 有效。
// [起讲] 构建卡片式启动横幅 → 进入全屏交互 → 循环处理用户输入 → 退出时恢复终端
// 入手：N/A

// ==== 起股 ====
// 取：CodeBaguConfig、options（model/apiKey/skill/workingDir）
// 验：API key 非空、workingDir 可写

// ==== 中股 ====
// 算：初始化 ConstraintEngine → GenerationValidator → AgentToolExecutor → AgentLoop
// 算：构建 ANSI 卡片式 banner（模型/项目/语言/约束）
// 算：进入 alternate screen → readline 循环 → 处理 /quit /clear / 正常输入

// ==== 后股 ====
// ✓ 正路径：用户输入 → AI 回复 → 显示输出 → 继续对话
// ✓ 正路径：/clear → 清屏重绘 banner → 继续对话
// ✗ 降级路径：API key 缺失 → 抛出 Error → 进程退出
// ✗ 降级路径：AI 调用异常 → 捕获错误 → 显示错误信息 → 继续对话
// ✗ 降级路径：/quit → 恢复终端 → 输出报告 → 退出进程

// ==== 束股 ====
// 给出：无（void，通过终端输出与用户交互）
// 留下：SessionMetrics 报告（.codebagu/session-report.json）

import * as readline from 'readline';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CodeBaguConfig } from '../config/types';
import { DeepSeekAdapter } from '../llm/deepseek';
import { AgentLoop } from '../agent/loop';
import { AgentToolExecutor } from '../agent/tools';
import { PromptInjector } from '../constraint/prompt';
import { ContextManager } from '../agent/context';
import { GenerationValidator } from '../constraint/validator';
import { ConstraintEngine } from '../constraint/engine';
import { TopoHeaderRule } from '../constraint/rules/topology';
import { BaguParagraphsRule } from '../constraint/rules/bagu';
import { DualityRule } from '../constraint/rules/duality';
import { FormatRule } from '../constraint/rules/format';
import { EmptyBaguRule } from '../constraint/rules/empty-bagu';
import { MetricsReporter } from '../agent/metrics';
import { getProfile } from '../config/languages';

// 破题：初始化所有组件并启动 readline 交互循环；不做命令解析。
// 承题：依赖 DeepSeekAdapter、AgentLoop、readline。前置条件: API key 已验证。
// [起讲] 组装约束引擎→校验器→工具执行器→LLM→对话循环的完整流水线
// 入手：N/A
export async function startChat(config: CodeBaguConfig, options: {
  model?: string; apiKey?: string; skill?: string; workingDir?: string;
}): Promise<void> {
  // ==== 起股 ====
  // 取：config、options
  // 验：API key 非空

  const apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('请设置 DEEPSEEK_API_KEY 环境变量或通过 --api-key 提供');

  const workingDir = options.workingDir || process.cwd();
  const model = options.model || 'deepseek-chat';

  // ==== 中股 ====
  // 算：初始化 ConstraintEngine → GenerationValidator → AgentToolExecutor → AgentLoop
  // 算：构建 ANSI 卡片式 banner
  // 算：进入 alternate screen → readline 循环

  const engine = new ConstraintEngine(config, [
    new TopoHeaderRule(), new BaguParagraphsRule(),
    new DualityRule(), new FormatRule(), new EmptyBaguRule(),
  ]);
  const validator = new GenerationValidator(engine, config.languages);
  const toolExecutor = new AgentToolExecutor(workingDir, validator, config.languages);
  const llm = new DeepSeekAdapter({ apiKey, model });
  const promptInjector = new PromptInjector(config);
  const contextManager = new ContextManager(workingDir);

  const agent = new AgentLoop(llm, toolExecutor, promptInjector, contextManager, validator, model);
  const skillContent = options.skill ? (contextManager.loadSkillFile(options.skill) ?? undefined) : undefined;
  agent.setSystemPrompt(skillContent);

  // ANSI colors (no external deps)
  const R = '\x1b[0m';
  const B = '\x1b[1m';
  const K = '\x1b[36m';   // cyan
  const L = '\x1b[96m';   // bright cyan
  const G = '\x1b[32m';   // green
  const Y = '\x1b[90m';   // gray

  const stripAnsi = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, '');
  const displayWidth = (s: string): number => [...stripAnsi(s)].reduce((a, c) => a + ((c.codePointAt(0)! > 0x7f) ? 2 : 1), 0);
  const pad = (s: string, n: number): string => s + ' '.repeat(Math.max(0, n - displayWidth(s)));

  const bw = 37;
  const top = `${K}┌${'─'.repeat(bw)}┐${R}`;
  const sep = `${K}├${'─'.repeat(bw)}┤${R}`;
  const bot = `${K}└${'─'.repeat(bw)}┘${R}`;

  const banner = [
    top,
    `${K}│${R}${pad(`  ${L}${B}八股编程 CLI — Code Bagu v1.0.0${R}`, bw)}${K}│${R}`,
    sep,
    `${K}│${R}${pad(`  ${K}模型:${R} ${model}`, bw)}${K}│${R}`,
    `${K}│${R}${pad(`  ${K}项目:${R} ${config.project}`, bw)}${K}│${R}`,
    `${K}│${R}${pad(`  ${K}语言:${R} ${config.languages.map(l => getProfile(l).name).join(', ')}`, bw)}${K}│${R}`,
    `${K}│${R}${pad(`  ${K}约束:${R} 启用`, bw)}${K}│${R}`,
    sep,
    `${K}│${R}${pad('  Usage:', bw)}${K}│${R}`,
    `${K}│${R}${pad(`    ${G}codebagu init${R}`, bw)}${K}│${R}`,
    `${K}│${R}${pad(`    ${G}codebagu check <path>${R}`, bw)}${K}│${R}`,
    `${K}│${R}${pad(`    ${G}codebagu chat${R} ${Y}← 当前模式${R}`, bw)}${K}│${R}`,
    sep,
    `${K}│${R}${pad(`  ${Y}快捷命令: /quit 退出  /clear 清除${R}`, bw)}${K}│${R}`,
    bot,
    '',
  ].join('\n');

  // 进入 alternate screen buffer，沉浸式体验
  process.stdout.write('\x1b[?1049h');
  process.stdout.write('\x1b[2J\x1b[H');
  console.log(banner);

  function showInputLine() {
    const metrics = agent.getMetrics();
    console.log(`\n${Y}─ input ─ model: ${model} | rounds: ${metrics.totalRounds}${R}`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });

  showInputLine();
  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();
    if (input === '/quit' || input === '/exit') { console.log('再见!'); rl.close(); return; }
    if (input === '/clear') {
      agent.setSystemPrompt(skillContent);
      process.stdout.write('\x1b[2J\x1b[H');
      console.log(banner);
      showInputLine();
      rl.prompt();
      return;
    }
    if (!input) { showInputLine(); rl.prompt(); return; }

    const divider = `${K}${'─'.repeat(50)}${R}`;
    try {
      const response = await agent.sendMessage(input);
      console.log(`\n${divider}`);
      console.log(response);
      console.log(`${divider}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`\n${divider}`);
      console.log(`❌ 错误: ${message}`);
      console.log(`${divider}\n`);
    }
    showInputLine();
    rl.prompt();
  });

  rl.on('close', () => {
    process.stdout.write('\x1b[?1049l');
    const metrics = agent.getMetrics();
    if (metrics.totalRounds > 0) {
      const reportDir = join(workingDir, '.codebagu');
      if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });
      const reportPath = join(reportDir, 'session-report.json');
      console.log(MetricsReporter.textSummary(metrics));
      MetricsReporter.generateReport(metrics, reportPath);
      console.log(`\n详细报告已保存: ${reportPath}`);
    }
    process.exit(0);
  });

  process.on('SIGINT', () => {
    rl.close();
  });
}
