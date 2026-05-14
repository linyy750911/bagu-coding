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
}

export interface LLMResponse {
  choices: Array<{ message: Completion; finish_reason: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export interface LLMAdapter {
  chat(request: LLMRequest): Promise<LLMResponse>;
}
