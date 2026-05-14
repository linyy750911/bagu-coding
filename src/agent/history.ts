import { Message } from '../llm/types';

const MAX_HISTORY = 100;

export class HistoryManager {
  private messages: Message[] = [];

  add(message: Message): void {
    this.messages.push(message);
    if (this.messages.length > MAX_HISTORY) {
      this.messages = this.messages.slice(-MAX_HISTORY);
    }
  }

  getAll(): Message[] { return [...this.messages]; }
  clear(): void { this.messages = []; }

  lastAssistantMessage(): Message | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant') return this.messages[i];
    }
    return null;
  }
}
