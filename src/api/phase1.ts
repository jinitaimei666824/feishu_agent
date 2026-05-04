import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { assertFeishuMvpConfig, getFeishuMvpConfig } from "../integrations/feishu/feishuConfig.js";
import {
  buildFallbackGeneratedDocCard,
  buildResolvedCard,
} from "../integrations/feishu/cards.js";
import { sendCardMessage, sendTextMessage, updateCardMessage } from "../integrations/feishu/imMessage.js";
import { runResourceDebugCheck } from "../integrations/feishu/probes.js";
import { runFullPipelineAndNotifyChat } from "../integrations/feishu/reportImDelivery.js";
import { parseFeishuImTextEvent } from "../integrations/feishu/webhookMessageParse.js";
import { handleBotMessageText } from "../phase1/botHandler.js";
import { runPhase1Mvp } from "../phase1/pipeline.js";
import { logger } from "../shared/logger.js";

const MvpBodySchema = z.object({
  userText: z.string().min(1, "userText 不能为空"),
  /** 发群/会话消息时填 chat_id；不传则看环境变量 FEISHU_IM_NOTIFY_CHAT_ID */
  chatId: z.string().optional(),
});

/**
 * 飞书事件体（只处理最基础的 challenge；加密事件请后续用官方解密）
 */
const WebhookBodySchema = z
  .object({
    type: z.string().optional(),
    challenge: z.string().optional(),
    token: z.string().optional(),
    schema: z.string().optional(),
    /** 飞书 2.0 加密事件体 */
    encrypt: z.string().optional(),
    header: z.record(z.unknown()).optional(),
    event: z.unknown().optional(),
  })
  .passthrough();

const CardCallbackBodySchema = z
  .object({
    challenge: z.string().optional(),
    event: z
      .object({
        action: z
          .object({
            value: z.record(z.unknown()).optional(),
          })
          .optional(),
        open_message_id: z.string().optional(),
      })
      .optional(),
    open_message_id: z.string().optional(),
  })
  .passthrough();

export async function registerPhase1Routes(app: FastifyInstance): Promise<void> {
  /**
   * 本地/联调：手动 POST 即跑通「复制 → 读块 → 按节生成 → 写回 → 可选发群」
   * POST /api/phase1/mvp  JSON { "userText": "…", "chatId"?: "oc_…" }
   */
  app.post("/api/phase1/mvp", async (request, reply) => {
    try {
      const body = MvpBodySchema.parse(request.body);
      const result = await runPhase1Mvp({
        userText: body.userText,
        chatId: body.chatId,
      });
      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          message: "请求参数不合法",
          issues: error.issues,
        });
      }
      logger.error("phase1 mvp failed", { error });
      return reply.status(500).send({
        message: error instanceof Error ? error.message : "内部错误",
      });
    }
  });

  /** 与 botHandler 命名一致，便于以后机器人路由直连 */
  app.post("/api/phase1/bot-message", async (request, reply) => {
    try {
      const body = MvpBodySchema.parse(request.body);
      const result = await handleBotMessageText({
        userText: body.userText,
        chatId: body.chatId,
      });
      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          message: "请求参数不合法",
          issues: error.issues,
        });
      }
      logger.error("phase1 bot-message failed", { error });
      return reply.status(500).send({
        message: error instanceof Error ? error.message : "内部错误",
      });
    }
  });

  /**
   * 飞书开放平台「事件订阅」配置请求 URL 时的 challenge 验证。
   * 注意：im.message 等事件若开启加密，需在后续版本解密 `encrypt` 字段。
   */
  app.post("/api/feishu/webhook", async (request, reply) => {
    const webhookParse = WebhookBodySchema.safeParse(request.body);
    if (!webhookParse.success) {
      return reply.status(400).send({ message: "invalid body" });
    }
    const body = webhookParse.data;
    if (body.type === "url_verification" && body.challenge) {
      return reply.send({ challenge: body.challenge });
    }
    if (body.encrypt) {
      return reply.status(200).send({
        message: "已收到加密事件，请在后续版本实现 decrypt（飞书 事件 2.0 文档）",
      });
    }

    const event = body.event;
    if (!event || typeof event !== "object") {
      return reply.status(200).send({ message: "ok" });
    }

    const imEvent = parseFeishuImTextEvent(event as Record<string, unknown>);
    if (!imEvent) {
      return reply.status(200).send({
        message: "ok",
        hint: "忽略：非用户文本、或无法解析",
      });
    }

    const c = getFeishuMvpConfig();
    if (!c.appId || !c.appSecret) {
      logger.error("webhook: 缺少 FEISHU_APP_ID / FEISHU_APP_SECRET");
      return reply.status(200).send({ message: "ok" });
    }

    /**
     * 飞书要求回调尽快返回（约 3s），长链路在后台跑完后通过 IM 主动发消息。
     */
    if (env.FEISHU_BOT_PIPELINE === "phase1") {
      void (async () => {
        try {
          assertFeishuMvpConfig();
          const result = await handleBotMessageText({
            userText: imEvent.text,
            chatId: imEvent.chatId,
          });
          await sendCardMessage(c, {
            receiveId: imEvent.chatId,
            card: buildFallbackGeneratedDocCard({
              title: result.copyName,
              docUrl: result.docUrl,
              sessionId: result.documentId,
            }),
          });
        } catch (error) {
          logger.error("webhook phase1 async failed", { error });
          try {
            await sendTextMessage(c, {
              receiveId: imEvent.chatId,
              text: `Phase1 生成失败：${error instanceof Error ? error.message : String(error)}`,
            });
          } catch (notifyErr) {
            logger.error("webhook phase1 error notify failed", { error: notifyErr });
          }
        }
      })();
    } else {
      void (async () => {
        try {
          await runFullPipelineAndNotifyChat(c, imEvent);
        } catch (error) {
          logger.error("webhook full pipeline async failed", { error });
          try {
            await sendTextMessage(c, {
              receiveId: imEvent.chatId,
              text: `报告生成失败：${error instanceof Error ? error.message : String(error)}`,
            });
          } catch (notifyErr) {
            logger.error("webhook full pipeline error notify failed", { error: notifyErr });
          }
        }
      })();
    }

    return reply.status(200).send({ message: "ok" });
  });

  app.post("/api/feishu/card-callback", async (request, reply) => {
    const parsed = CardCallbackBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: "invalid card callback" });
    }
    const body = parsed.data;
    if (body.challenge) {
      return reply.send({ challenge: body.challenge });
    }

    const messageId =
      body.event?.open_message_id ?? body.open_message_id ?? "";
    const action = body.event?.action?.value;
    const actionName =
      action && typeof action === "object" && typeof action.action === "string"
        ? action.action
        : "";
    if (!messageId || actionName !== "mark_done") {
      return reply.status(200).send({ message: "ok" });
    }

    try {
      const c = getFeishuMvpConfig();
      await updateCardMessage(c, {
        messageId,
        card: buildResolvedCard(),
      });
    } catch (error) {
      logger.error("card callback update failed", { error });
    }
    return reply.status(200).send({ message: "ok" });
  });

  /**
   * 源模板 / 目标文件夹 探针（不调用 drive copy、不跑生成逻辑）
   * GET /api/phase1/debug-resource-check?deleteProbeDoc=true  — 目标探测成功后删临时 docx
   */
  app.get("/api/phase1/debug-resource-check", async (request, reply) => {
    const q = request.query as { deleteProbeDoc?: string };
    const deleteProbeDoc = q.deleteProbeDoc === "1" || q.deleteProbeDoc === "true";
    try {
      const c = getFeishuMvpConfig();
      if (!c.appId || !c.appSecret) {
        return reply.status(400).send({
          message: "需要配置 FEISHU_APP_ID 与 FEISHU_APP_SECRET",
        });
      }
      const out = await runResourceDebugCheck(c, { deleteProbeDoc });
      return reply.send(out);
    } catch (error) {
      logger.error("debug-resource-check failed", { error });
      return reply.status(500).send({
        message: error instanceof Error ? error.message : "内部错误",
      });
    }
  });

  app.get("/api/phase1/config-check", async (_request, reply) => {
    const c = getFeishuMvpConfig();
    const ok = Boolean(
      c.appId && c.appSecret && c.templateFileToken && c.targetFolderToken,
    );
    if (!ok) {
      return reply.send({
        ok: false,
        missing: {
          FEISHU_APP_ID: !c.appId,
          FEISHU_APP_SECRET: !c.appSecret,
          FEISHU_TEMPLATE_FILE_TOKEN: !c.templateFileToken,
          FEISHU_TARGET_FOLDER_TOKEN: !c.targetFolderToken,
        },
      });
    }
    try {
      assertFeishuMvpConfig();
      return reply.send({ ok: true });
    } catch (e) {
      return reply.send({ ok: false, error: String(e) });
    }
  });
}
