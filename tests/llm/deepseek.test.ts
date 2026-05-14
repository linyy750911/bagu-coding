import { describe, it, expect, vi } from 'vitest';
import { DeepSeekAdapter } from '../../src/llm/deepseek';

describe('DeepSeekAdapter', () => {
  it('should construct message payload correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const adapter = new DeepSeekAdapter({ apiKey: 'test-key' });
    const response = await adapter.chat({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(response.choices[0].message.content).toBe('hello');
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.messages).toHaveLength(1);
    expect(callBody.messages[0].content).toBe('hi');

    vi.unstubAllGlobals();
  });
});
