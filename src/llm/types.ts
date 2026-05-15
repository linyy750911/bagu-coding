/**
 * ===================================================================
 * 模块名:        llm/types.ts
 * 输入输出:      无运行时输入，导出 LLM 领域类型定义
 * 数据流向:      类型定义 → adapter.ts / deepseek.ts / agent/loop.ts / tools.ts
 * 修改风险点:    新增 Message 字段需同步更新 deepseek.ts 的 body 构造映射
 * 最近修改:      2026-05-15 — 新增 reasoning_content 字段
 * ===================================================================
 */

// 破题：本模块不做运行时逻辑，只做 LLM 交互协议的 TypeScript 契约。
// 承题：Message / LLMRequest / LLMResponse 构成 Agent 与外部 LLM 的通信骨架，
//       ToolCall 和 ToolDefinition 支撑 function calling 机制。
// [起讲] reasoning_content 字段用于 DeepSeek-R1 等推理模型的思维链透传，
//       不暴露给普通用户但需保留于消息对象中。
// 入手：接口设计遵循 OpenAI API 规范，保证与主流供应商的兼容性。

// ==== 起股 ====
// 取：ToolCall、Message、ToolDefinition、LLMRequest、Completion、LLMResponse、LLMAdapter。
// 验：TypeScript 编译期静态检查，无运行时验证。
// ==== 中股 ====
// 算：Message.role 限定四种角色，Completion.role 限定 'assistant'；
//     LLMRequest.tools 为可选数组，LLMResponse.usage 为可选计费信息。
// 转：类型驱动 deepseek.ts 的请求体构造与响应解析。
// ==== 后股 ====
// ✓ 正路径：类型完整 → 编译通过 → AgentLoop 可安全调用 adapter.chat()
// ✗ 降级路径：字段类型错误 → 编译报错 → 开发阶段拦截
// ✗ 降级路径：接口变更未同步 → deepseek.ts 类型不匹配 → 强制修复
// ==== 束股 ====
// 给出：导出 7 个接口，覆盖工具调用、消息、请求、响应、适配器五个维度。
// 留下：未来支持流式响应时，可新增 StreamChunk 接口而不破坏现有契约。

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  reasoning_content?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMRequest {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  max_tokens?: number;
  temperature?: number;
}

export interface Completion {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
  reasoning_content?: string;
}

export interface LLMResponse {
  choices: Array<{ message: Completion; finish_reason: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export interface LLMAdapter {
  chat(request: LLMRequest): Promise<LLMResponse>;
}
