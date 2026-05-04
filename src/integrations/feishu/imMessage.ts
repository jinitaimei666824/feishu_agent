import { logger } from "../../shared/logger.js";
import type { FeishuMvpConfig } from "./feishuConfig.js";
import { getTenantAccessToken } from "./token.js";

type ImResponse = {
  code?: number;
  msg?: string;
  data?: {
    message_id?: string;
  };
};

/**
 * 发一条文本消息到群或单聊（receive_id 为 chat_id 时需 receive_id_type=chat_id）
 * @see https://open.feishu.cn/document/server-docs/im-v1/message/create
 */
export async function sendTextMessage(
  c: FeishuMvpConfig,
  options: {
    receiveId: string;
    text: string;
    receiveIdType?: "chat_id" | "open_id";
  },
): Promise<{ messageId?: string }> {
  if (!options.receiveId) {
    throw new Error("IM receive_id 为空");
  }
  const access = await getTenantAccessToken(c);
  const idType = options.receiveIdType ?? "chat_id";
  const qs = new URLSearchParams({ receive_id_type: idType });
  const url = `${c.baseUrl}/open-apis/im/v1/messages?${qs.toString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      receive_id: options.receiveId,
      msg_type: "text",
      content: JSON.stringify({ text: options.text }),
    }),
  });
  const data = (await res.json()) as ImResponse;
  if (!res.ok || data.code !== 0) {
    logger.error("飞书 发消息失败", { status: res.status, data });
    throw new Error(
      `飞书 im message: ${data.msg ?? res.status} (code=${data.code})`,
    );
  }
  return { messageId: data.data?.message_id };
}

export async function sendCardMessage(
  c: FeishuMvpConfig,
  options: {
    receiveId: string;
    card: Record<string, unknown>;
    receiveIdType?: "chat_id" | "open_id";
  },
): Promise<{ messageId?: string }> {
  if (!options.receiveId) {
    throw new Error("IM receive_id 为空");
  }
  const access = await getTenantAccessToken(c);
  const idType = options.receiveIdType ?? "chat_id";
  const qs = new URLSearchParams({ receive_id_type: idType });
  const url = `${c.baseUrl}/open-apis/im/v1/messages?${qs.toString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      receive_id: options.receiveId,
      msg_type: "interactive",
      content: JSON.stringify(options.card),
    }),
  });
  const data = (await res.json()) as ImResponse;
  if (!res.ok || data.code !== 0) {
    logger.error("飞书 发卡片失败", { status: res.status, data });
    throw new Error(
      `飞书 im card: ${data.msg ?? res.status} (code=${data.code})`,
    );
  }
  return { messageId: data.data?.message_id };
}

export async function updateCardMessage(
  c: FeishuMvpConfig,
  options: { messageId: string; card: Record<string, unknown> },
): Promise<void> {
  if (!options.messageId) {
    throw new Error("messageId 为空，无法更新卡片");
  }
  const access = await getTenantAccessToken(c);
  const url = `${c.baseUrl}/open-apis/im/v1/messages/${encodeURIComponent(
    options.messageId,
  )}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      content: JSON.stringify(options.card),
    }),
  });
  const data = (await res.json()) as ImResponse;
  if (!res.ok || data.code !== 0) {
    logger.error("飞书 更新卡片失败", { status: res.status, data });
    throw new Error(
      `飞书 im patch: ${data.msg ?? res.status} (code=${data.code})`,
    );
  }
}
