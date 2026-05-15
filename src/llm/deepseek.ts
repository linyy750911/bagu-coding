/**
 * ===================================================================
 * 模块名:        llm/deepseek.ts
 * 输入输出:      LLMRequest → HTTP POST → LLMResponse
 * 数据流向:      AgentLoop 构造请求 → DeepSeekAdapter.chat() → DeepSeek API → 解析 JSON
 * 修改风险点:    API 字段变更、超时时间调整、错误处理逻辑、token 计费
 * 最近修改:      2026-05-15 — 增加 reasoning_content 透传，AbortController 超时控制
 * ===================================================================
 */

import { LLMAdapter, LLMRequest, LLMResponse } from './types';

// 破题：本模块不做业务编排，只做 DeepSeek API 的协议适配与网络通信。
// 承题：将内部 LLMRequest 翻译为 DeepSeek /chat/completions 的请求体，
//       处理超时、错误码、异常中断，返回标准化的 LLMResponse。
// [起讲] AbortController 设置 60 秒硬超时，防止网络悬停导致 Agent 假死；
//       所有 fetch 异常统一包装为带上下文信息的 Error。
// 入手：baseUrl 和 model 提供默认值，允许 config 层覆盖，保证开箱即用。

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class DeepSeekAdapter implements LLMAdapter {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  // ==== 起股 ====
  // 取：DeepSeekConfig 对象（apiKey 必填，baseUrl / model 可选）。
  // 验：apiKey 非空由调用方保证，此处不做二次校验（信任 schema 层）。
  // ==== 中股 ====
  // 算：baseUrl 默认 'https://api.deepseek.com/v1'，model 默认 'deepseek-chat'。
  // 转：将配置项保存为实例私有字段，供 chat() 方法复用。
  // ==== 后股 ====
  // ✓ 正路径：配置完整 → 实例化成功
  // ✗ 降级路径：apiKey 为空 → 调用方提前抛错 → 不进入本层
  // ==== 束股 ====
  // 给出：构造可复用的 DeepSeekAdapter 实例。
  // 留下：支持 baseUrl 覆盖，便于代理或私有化部署场景。
  constructor(config: DeepSeekConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
    this.model = config.model || 'deepseek-chat';
  }

  // ==== 起股 ====
  // 取：LLMRequest（messages / tools / max_tokens / temperature / model）。
  // 验：消息数组非空由 AgentLoop 保证；可选字段仅在存在时写入请求体。
  // ==== 中股 ====
  // 算：构造 request body，映射 message 字段（含 reasoning_content 透传）；
  //     使用 AbortController 设置 60 秒超时；
  //     序列化 body 并通过 fetch 发送 POST。
  // 转：解析 response.json() 并断言为 LLMResponse 类型返回。
  // ==== 后股 ====
  // ✓ 正路径：API 返回 200 → 解析 JSON → 返回 LLMResponse
  // ✗ 降级路径：HTTP 非 2xx → 读取错误文本 → 抛出带状态码的 Error
  // ✗ 降级路径：请求超时 → AbortController 触发 → 抛出"请求超时"Error
  // ✗ 降级路径：网络异常 → catch 捕获 → 原样抛出或包装为超时提示
  // ==== 束股 ====
  // 给出：返回包含 choices / usage 的标准化 LLMResponse。
  // 留下：clearTimeout 在 try 和 catch 中各调用一次，避免定时器泄漏。
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: request.model || this.model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        ...(m.reasoning_content ? { reasoning_content: m.reasoning_content } : {}),
      })),
    };

    if (request.tools && request.tools.length > 0) body.tools = request.tools;
    if (request.max_tokens) body.max_tokens = request.max_tokens;
    if (request.temperature !== undefined) body.temperature = request.temperature;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`DeepSeek API error ${response.status}: ${text}`);
      }

      return response.json() as Promise<LLMResponse>;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('DeepSeek API 请求超时（60秒）');
      }
      throw err;
    }
  }
}
