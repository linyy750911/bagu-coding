import { LLMAdapter, LLMRequest, LLMResponse } from './types';

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class DeepSeekAdapter implements LLMAdapter {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config: DeepSeekConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
    this.model = config.model || 'deepseek-chat';
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: request.model || this.model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
    };

    if (request.tools && request.tools.length > 0) body.tools = request.tools;
    if (request.max_tokens) body.max_tokens = request.max_tokens;
    if (request.temperature !== undefined) body.temperature = request.temperature;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<LLMResponse>;
  }
}
