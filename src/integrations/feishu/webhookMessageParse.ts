/**
 * 解析飞书 IM 文本消息事件（明文 body.event），供 webhook 构造 UserRequest。
 * @see https://open.feishu.cn/document/server-docs/im-v1/message/events/receive
 */

export type ParsedFeishuImTextEvent = {
  chatId: string;
  messageId: string;
  text: string;
  /** 优先 open_id，无则 union_id，用于 UserRequest.userId */
  userId: string;
  senderType?: string;
  /** 来自 message.chat_type，如 p2p / group */
  chatType?: string;
  /**
   * 发消息 API 的 receive_id：群聊用 chat_id；单聊 p2p 须用用户 open_id + receive_id_type=open_id。
   */
  imReceiveId: string;
  imReceiveIdType: "chat_id" | "open_id";
};

function readSenderType(event: Record<string, unknown>): string | undefined {
  const sender = event.sender as Record<string, unknown> | undefined;
  return typeof sender?.sender_type === "string" ? sender.sender_type : undefined;
}

function readUserId(event: Record<string, unknown>): string | undefined {
  const sender = event.sender as Record<string, unknown> | undefined;
  const senderId = sender?.sender_id as Record<string, unknown> | undefined;
  if (!senderId) return undefined;
  const open = typeof senderId.open_id === "string" ? senderId.open_id : "";
  if (open.trim()) return open.trim();
  const union = typeof senderId.union_id === "string" ? senderId.union_id : "";
  if (union.trim()) return union.trim();
  const userId = typeof senderId.user_id === "string" ? senderId.user_id : "";
  return userId.trim() || undefined;
}

/**
 * 从明文 event 解析用户文本消息；非用户发送、非文本、缺字段时返回 null。
 */
export function parseFeishuImTextEvent(event: Record<string, unknown>): ParsedFeishuImTextEvent | null {
  const senderType = readSenderType(event);
  if (senderType === "app") {
    return null;
  }

  const message = event.message as Record<string, unknown> | undefined;
  const chatId = typeof message?.chat_id === "string" ? message.chat_id.trim() : "";
  const chatType =
    typeof message?.chat_type === "string" ? message.chat_type.trim() : undefined;
  const messageIdRaw = typeof message?.message_id === "string" ? message.message_id.trim() : "";
  const messageType =
    typeof message?.message_type === "string" ? message.message_type : undefined;
  const rawContent = typeof message?.content === "string" ? message.content : "";

  if (!chatId || !messageType || !rawContent) {
    return null;
  }

  let text = "";
  try {
    const parsed = JSON.parse(rawContent) as Record<string, unknown>;
    text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  } catch {
    return null;
  }

  if (!text) {
    return null;
  }

  const messageId =
    messageIdRaw ||
    `fallback_${chatId.replace(/[^a-zA-Z0-9]+/g, "_")}_${Date.now().toString(36)}`;

  const realUserId = readUserId(event);
  const uid = realUserId ?? `anon_${chatId.replace(/[^a-zA-Z0-9]+/g, "").slice(-16) || "user"}`;

  const isP2p = chatType === "p2p" && Boolean(realUserId);
  const imReceiveId = isP2p ? realUserId! : chatId;
  const imReceiveIdType: "chat_id" | "open_id" = isP2p ? "open_id" : "chat_id";

  return {
    chatId,
    messageId,
    text,
    userId: uid,
    senderType,
    chatType,
    imReceiveId,
    imReceiveIdType,
  };
}
