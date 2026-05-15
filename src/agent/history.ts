/**
 * HistoryManager — 对话历史消息管理器 (history.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: Message（user / assistant / system / tool）
 *   输出: Message[]（完整历史）/ Message | null（最后一条助手消息）
 *   数据流向:
 *     add(message) → 追加到数组 → 超出 MAX_HISTORY 时截断尾部
 *     getAll() → 返回副本
 *     lastAssistantMessage() → 反向遍历查找 assistant
 *   修改风险点:
 *     ⚠️ 第4行: MAX_HISTORY=100 是硬编码，长会话可能丢失早期上下文
 *   最近修改:
 *     2026-05-15: 新增 lastAssistantMessage 方法，用于提取 reasoning_content
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：管理用户与 AI 的多轮对话消息历史；不做消息内容压缩或摘要。
// 承题：无外部依赖。前置条件: Message 对象格式正确。
// [起讲] 滑动窗口历史管理——保持最近 100 条消息，避免 LLM 上下文溢出
// 入手：N/A

// ==== 起股 ====
// 取：Message 对象
// 验：role 为有效值（user/assistant/system/tool）

// ==== 中股 ====
// 算：追加消息到数组
// 算：超出 MAX_HISTORY 时从头部截断（保留尾部最新消息）
// 算：反向查找最后一条 assistant 消息

// ==== 后股 ====
// ✓ 正路径：消息追加成功 → 历史更新
// ✗ 降级路径：超出上限 → 自动截断旧消息

// ==== 束股 ====
// 给出：Message[] / Message | null
// 留下：内部 messages 数组状态变更

import { Message } from '../llm/types';

const MAX_HISTORY = 100;

export class HistoryManager {
  private messages: Message[] = [];

  add(message: Message): void {
    // ==== 起股 ====
    // 取：Message
    // 验：message 非空

    // ==== 中股 ====
    // 算：追加到数组

    this.messages.push(message);
    if (this.messages.length > MAX_HISTORY) {
      // ==== 后股 ====
      // ✗ 降级路径：超出上限 → 截断旧消息
      this.messages = this.messages.slice(-MAX_HISTORY);
    }

    // ==== 束股 ====
    // 给出：void
    // 留下：更新后的 messages
  }

  getAll(): Message[] {
    // ==== 起股 ====
    // 取：N/A

    // ==== 中股 ====
    // 算：返回数组副本

    // ==== 束股 ====
    // 给出：Message[]
    // 留下：N/A

    return [...this.messages];
  }

  clear(): void {
    // ==== 起股 ====
    // 取：N/A

    // ==== 中股 ====
    // 算：清空数组

    // ==== 束股 ====
    // 给出：void
    // 留下：空数组

    this.messages = [];
  }

  lastAssistantMessage(): Message | null {
    // ==== 起股 ====
    // 取：N/A
    // 验：messages 非空

    // ==== 中股 ====
    // 算：反向遍历查找 role === 'assistant'

    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant') return this.messages[i];
    }

    // ==== 后股 ====
    // ✗ 降级路径：无 assistant 消息 → 返回 null

    // ==== 束股 ====
    // 给出：Message | null
    // 留下：N/A

    return null;
  }
}
