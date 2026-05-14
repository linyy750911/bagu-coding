import { LLMAdapter, Message, ToolCall, LLMResponse } from '../llm/types';
import { PromptInjector } from '../constraint/prompt';
import { AgentToolExecutor, AGENT_TOOLS } from './tools';
import { ContextManager } from './context';
import { HistoryManager } from './history';
import { GenerationValidator } from '../constraint/validator';

const MAX_RETRIES = 3;

export interface SessionMetrics {
  startTime: number;
  totalRounds: number;        // 用户输入 + AI 回复的总轮数
  toolCalls: number;           // 工具调用总次数
  writeAttempts: number;       // write_file 尝试次数
  writeBlocked: number;        // 被校验器拦截的次数
  retryCount: number;          // 因校验失败触发的 retry 次数
  ruleViolations: Record<string, number>; // 各规则拦截次数
  lastRoundLatency: number;    // 最后一轮 LLM 响应耗时 ms
}

export class AgentLoop {
  private llm: LLMAdapter;
  private tools: AgentToolExecutor;
  private promptInjector: PromptInjector;
  private context: ContextManager;
  private history: HistoryManager;
  private validator: GenerationValidator;
  private model: string;
  private metrics: SessionMetrics;

  constructor(
    llm: LLMAdapter,
    toolExecutor: AgentToolExecutor,
    promptInjector: PromptInjector,
    contextManager: ContextManager,
    validator: GenerationValidator,
    model: string,
  ) {
    this.llm = llm;
    this.tools = toolExecutor;
    this.promptInjector = promptInjector;
    this.context = contextManager;
    this.history = new HistoryManager();
    this.validator = validator;
    this.model = model;
    this.metrics = {
      startTime: Date.now(),
      totalRounds: 0,
      toolCalls: 0,
      writeAttempts: 0,
      writeBlocked: 0,
      retryCount: 0,
      ruleViolations: {},
      lastRoundLatency: 0,
    };
  }

  getMetrics(): SessionMetrics {
    return { ...this.metrics };
  }

  setSystemPrompt(skillContent?: string): void {
    const projectContext = this.context.getProjectContext();
    const systemContent = this.promptInjector.buildSystemPrompt(projectContext, skillContent);
    this.history = new HistoryManager();
    this.history.add({
      role: 'system',
      content: systemContent + '\n\nYou are a helpful AI coding assistant. Write code that fully complies with the Code Bagu standard above.',
    });
  }

  async sendMessage(userInput: string): Promise<string> {
    let retryCount = 0;
    this.metrics.totalRounds++;
    this.history.add({ role: 'user', content: userInput });

    while (retryCount < MAX_RETRIES) {
      const startTime = Date.now();
      const response = await this.llm.chat({
        model: this.model,
        messages: this.history.getAll(),
        tools: AGENT_TOOLS,
        max_tokens: 4096,
      });
      this.metrics.lastRoundLatency = Date.now() - startTime;

      const choice = response.choices[0];
      const assistantMsg: Message = {
        role: 'assistant',
        content: choice.message.content,
        tool_calls: choice.message.tool_calls,
        reasoning_content: choice.message.reasoning_content,
      };
      this.history.add(assistantMsg);

      if (choice.message.content && !choice.message.tool_calls) {
        return choice.message.content;
      }

      if (choice.message.tool_calls) {
        const result = await this.handleToolCalls(choice.message.tool_calls);
        if (result.retry && retryCount < MAX_RETRIES) {
          retryCount++;
          this.metrics.retryCount++;
          const violations = this.validator.validate(result.filePath || '', result.content || '').violations;
          const constraintPrompt = this.promptInjector.buildConstraintPrompt(violations);
          this.history.add({ role: 'system', content: `[约束反馈] ${constraintPrompt}` });
          continue;
        }
        if (result.done) return result.output || '操作完成';
      }

      return choice.message.content || '';
    }

    return `已达到最大重试次数（${MAX_RETRIES}次），请检查 Code Bagu 规范并手动修正。`;
  }

  private async handleToolCalls(toolCalls: ToolCall[]): Promise<{
    retry: boolean; done: boolean; output: string; filePath?: string; content?: string;
  }> {
    for (const call of toolCalls) {
      this.metrics.toolCalls++;
      const args = JSON.parse(call.function.arguments);
      const result = await this.tools.execute(call.function.name, args);

      if (call.function.name === 'write_file') {
        this.metrics.writeAttempts++;
      }

      if (result.validationError) {
        this.metrics.writeBlocked++;
        // 统计各规则拦截次数
        const violations = this.validator.validate(args.path as string, args.content as string).violations;
        for (const v of violations) {
          this.metrics.ruleViolations[v.ruleId] = (this.metrics.ruleViolations[v.ruleId] || 0) + 1;
        }
        return {
          retry: true, done: false, output: result.validationError,
          filePath: args.path as string, content: args.content as string,
        };
      }

      this.history.add({ role: 'tool', content: result.output, tool_call_id: call.id });
    }

    const followUp = await this.llm.chat({
      model: this.model, messages: this.history.getAll(), max_tokens: 4096,
    });
    const msg = followUp.choices[0].message;
    this.history.add({ role: 'assistant', content: msg.content, reasoning_content: msg.reasoning_content });
    return { retry: false, done: true, output: msg.content || '完成' };
  }
}
