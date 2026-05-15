/**
 * AgentLoop — AI 对话循环与工具调度 (loop.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: 用户文本输入 / 工具调用结果 / 校验失败反馈
 *   输出: AI 回复文本 / 文件写入操作 / 重试指令
 *
 *   数据流向:
 *     用户输入 → sendMessage() → LLM.chat() →  assistant message
 *       ↓
 *     有 tool_calls? → handleToolCalls() → 工具执行 → 结果回传
 *       ↓
 *     校验失败? → buildConstraintPrompt() → 重试循环(MAX_RETRIES)
 *       ↓
 *     无 tool_calls → 直接返回 content
 *
 * 修改风险点:
 *   ⚠️ 第85行: 重试循环可能无限递归（已用 MAX_RETRIES=3 限制）
 *   ⚠️ 第110行: handleToolCalls 中 tool_call_id 回传错误导致 LLM 400
 *   ⚠️ 第145行: 多 tool_call 时只处理第一个 write_file，后续可能跳过校验
 *   ⚠️ 第180行: 上下文膨胀未做截断，长会话可能爆 token
 *
 * 最近修改:
 *   2026-05-14: 修复 DeepSeek v4-pro reasoning_content 回传
 *   2026-05-14: 新增 SessionMetrics 监控埋点
 *   2026-05-15: 八股自举
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：管理用户与 LLM 的多轮对话循环，调度工具调用并强制八股校验；不做 LLM 模型选择或 prompt 工程优化。
// 承题：依赖 LLMAdapter / AgentToolExecutor / PromptInjector / GenerationValidator。前置条件: API key 有效、工作目录可写。
// [起讲] 基于重试机制的八股约束执行器——生成→校验→反馈→重试，直到合规或耗尽次数
// 入手：N/A（资源由构造函数注入）

// ==== 起股 ====
// 取：用户输入字符串、历史消息数组、工具定义列表
// 验：输入非空、历史消息未超 MAX_HISTORY=100、模型已配置

// ==== 中股 ====
// 算：构造 LLMRequest → 发送 chat → 解析响应
// 算：判断响应类型（纯文本 / tool_calls）
// 算：tool_calls → 调度执行 → 校验结果 → 决定重试或完成
// 转：ToolResult → Message → 追加历史 → 下一轮或返回

// ==== 后股 ====
// ✓ 正路径：用户输入 → LLM 返回纯文本 → 直接输出
// ✓ 正路径：用户输入 → LLM 请求 write_file → 校验通过 → 写入成功 → 返回确认
// ✗ 降级路径1：write_file 校验失败 → 构造约束反馈 → 重试(MAX_RETRIES) → 最终通过或报错
// ✗ 降级路径2：LLM API 超时/报错 → 捕获异常 → 返回错误提示
// ✗ 降级路径3：tool_call 执行异常 → 异常信息回传 LLM → LLM 自行修正
// ✗ 降级路径4：达到 MAX_RETRIES → 返回"已达到最大重试次数"提示

// ==== 束股 ====
// 给出：string（AI 回复文本或错误提示）
// 留下：SessionMetrics 监控数据、更新后的对话历史

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

  // 破题：接收用户输入并驱动多轮对话循环；不做输入预处理或敏感词过滤。
  // 承题：依赖 this.llm、this.history、this.validator。前置条件: 系统 prompt 已设置。
  // [起讲] 核心调度循环：LLM 生成 → 判断响应类型 → 执行工具或返回文本 → 校验失败则重试
  // 入手：N/A
  async sendMessage(userInput: string): Promise<string> {
    // ==== 起股 ====
    // 取：用户输入字符串
    // 验：输入非空

    let retryCount = 0;
    this.metrics.totalRounds++;
    this.history.add({ role: 'user', content: userInput });

    // ==== 中股 ====
    // 算：构造 LLM 请求 → 发送 chat → 解析响应
    // 算：判断响应类型（纯文本 / tool_calls）
    // 算：tool_calls → 调度执行 → 校验结果 → 决定重试或完成

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

    // ==== 后股 ====
    // ✓ 正路径：LLM 返回纯文本或工具执行成功
    // ✗ 降级路径：达到 MAX_RETRIES → 返回失败提示

    // ==== 束股 ====
    // 给出：string（AI 回复文本或错误提示）
    // 留下：更新后的对话历史、SessionMetrics

    return `已达到最大重试次数（${MAX_RETRIES}次），请检查 Code Bagu 规范并手动修正。`;
  }

  // 破题：遍历执行工具调用并处理校验失败；不做工具参数预校验。
  // 承题：依赖 this.tools、this.validator、this.llm。前置条件: toolCalls 为有效数组。
  // [起讲] 工具执行流水线：解析参数 → 执行 → 校验 → 结果回传或触发重试
  // 入手：N/A
  private async handleToolCalls(toolCalls: ToolCall[]): Promise<{
    retry: boolean; done: boolean; output: string; filePath?: string; content?: string;
  }> {
    // ==== 起股 ====
    // 取：ToolCall 数组
    // 验：数组非空、每个 call 包含 name 和 arguments

    // ==== 中股 ====
    // 算：遍历 toolCalls → 解析参数 → 执行工具
    // 算：write_file 校验失败 → 统计违规 → 返回 retry 指令
    // 算：全部成功 → 追加 tool 结果到历史 → 请求 LLM 跟进

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

    // ==== 后股 ====
    // ✓ 正路径：所有工具执行成功 → LLM 跟进完成
    // ✗ 降级路径：write_file 校验失败 → 返回 retry
    // ✗ 降级路径：工具执行异常 → 错误信息回传

    // ==== 束股 ====
    // 给出：{ retry, done, output, filePath?, content? }
    // 留下：更新的历史消息、SessionMetrics

    const followUp = await this.llm.chat({
      model: this.model, messages: this.history.getAll(), max_tokens: 4096,
    });
    const msg = followUp.choices[0].message;
    this.history.add({ role: 'assistant', content: msg.content, reasoning_content: msg.reasoning_content });
    return { retry: false, done: true, output: msg.content || '完成' };
  }
}
