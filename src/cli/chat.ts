import * as readline from 'readline';
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

export async function startChat(config: CodeBaguConfig, options: {
  model?: string; apiKey?: string; skillPath?: string; workingDir?: string;
}): Promise<void> {
  const apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('请设置 DEEPSEEK_API_KEY 环境变量或通过 --api-key 提供');

  const workingDir = options.workingDir || process.cwd();
  const model = options.model || 'deepseek-chat';

  const engine = new ConstraintEngine(config, [
    new TopoHeaderRule(), new BaguParagraphsRule(),
    new DualityRule(), new FormatRule(), new EmptyBaguRule(),
  ]);
  const validator = new GenerationValidator(engine);
  const toolExecutor = new AgentToolExecutor(workingDir, validator);
  const llm = new DeepSeekAdapter({ apiKey, model });
  const promptInjector = new PromptInjector(config);
  const contextManager = new ContextManager(workingDir);

  const agent = new AgentLoop(llm, toolExecutor, promptInjector, contextManager, validator, model);
  const skillContent = options.skillPath ? (contextManager.loadSkillFile(options.skillPath) ?? undefined) : undefined;
  agent.setSystemPrompt(skillContent);

  console.log(`Code Bagu v1.0.0 | 八股约束: 启用 | 模型: ${model}`);
  console.log(`项目: ${config.project} | 语言: ${config.languages.join(', ')}`);
  console.log('输入 /quit 退出，/clear 清除对话\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();
    if (input === '/quit' || input === '/exit') { console.log('再见!'); rl.close(); process.exit(0); }
    if (input === '/clear') { agent.setSystemPrompt(skillContent); console.log('对话已清除\n'); rl.prompt(); return; }
    if (!input) { rl.prompt(); return; }

    try {
      const response = await agent.sendMessage(input);
      console.log(`\n${response}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`\n❌ 错误: ${message}\n`);
    }
    rl.prompt();
  });
}
