import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import {
  feishuVerificationTokenMatches,
  takeUrlVerificationChallenge,
} from "../integrations/feishu/urlVerification.js";
import { WebhookBodySchema } from "../schemas/feishuWebhookBody.js";
import { logger } from "../shared/logger.js";

function inboundHasEncrypt(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const enc = (raw as Record<string, unknown>).encrypt;
  return typeof enc === "string" && enc.trim().length > 0;
}

async function resolveFeishuWebhookPayload(raw: unknown): Promise<unknown> {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const enc = o.encrypt;
  if (typeof enc !== "string" || !enc.trim()) return raw;

  const key = env.FEISHU_ENCRYPT_KEY?.trim();
  if (!key) {
    logger.warn(
      "[feishu webhook] 收到 encrypt 字段但未配置 FEISHU_ENCRYPT_KEY，无法解析 IM；请在 Vercel Environment Variables 填入飞书「事件与回调 → 加密策略」的 Encrypt Key，或关闭加密。",
    );
    return raw;
  }

  const { decryptFeishuEncryptField } = await import("../integrations/feishu/feishuEventDecrypt.js");
  const jsonText = decryptFeishuEncryptField(key, enc.trim());
  try {
    return JSON.parse(jsonText) as unknown;
  } catch {
    const n = jsonText.indexOf("{");
    const m = jsonText.lastIndexOf("}");
    if (n >= 0 && m > n) {
      return JSON.parse(jsonText.slice(n, m + 1)) as unknown;
    }
    throw new Error("解密结果不是 JSON");
  }
}

function peekEventType(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as Record<string, unknown>;
  if (typeof p.type === "string" && p.type.includes("verification")) return p.type;
  const h = p.header;
  if (h && typeof h === "object" && !Array.isArray(h)) {
    const t = (h as Record<string, unknown>).event_type;
    if (typeof t === "string") return t;
  }
  return "";
}

/**
 * 飞书事件订阅回调：与 report/phase1 分离，保证 Vercel 冷启动时尽快可答 url_verification。
 */
export async function registerFeishuWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.head("/api/feishu/webhook", async (_request, reply) => {
    return reply.status(204).send();
  });

  app.post("/api/feishu/webhook", async (request, reply) => {
    try {
      const raw = request.body;

      /**
       * 明文 url_verification：必须在解密/动态 import dispatch 之前直接返回 challenge，避免 3s 超时或挂起。
       */
      if (!inboundHasEncrypt(raw)) {
        const quickChallenge = takeUrlVerificationChallenge(raw);
        if (quickChallenge) {
          if (!feishuVerificationTokenMatches(raw)) {
            logger.warn(
              "[feishu webhook] url_verification token 与 FEISHU_VERIFICATION_TOKEN 不一致或未带 token",
            );
            return reply.status(403).send({ message: "verification token mismatch" });
          }
          logger.info("[feishu webhook] url_verification ok (plaintext)");
          return reply.send({ challenge: quickChallenge });
        }
      }

      let payload: unknown;
      try {
        payload = await resolveFeishuWebhookPayload(raw);
      } catch {
        return reply.status(400).send({ message: "decrypt failed" });
      }

      const verifyChallenge = takeUrlVerificationChallenge(payload);
      if (verifyChallenge) {
        if (!feishuVerificationTokenMatches(payload)) {
          logger.warn(
            "[feishu webhook] url_verification token 与 FEISHU_VERIFICATION_TOKEN 不一致或未带 token",
          );
          return reply.status(403).send({ message: "verification token mismatch" });
        }
        logger.info("[feishu webhook] url_verification ok (encrypted payload)");
        return reply.send({ challenge: verifyChallenge });
      }

      logger.info("[feishu webhook] event", {
        type: peekEventType(payload),
        encryptedInbound: inboundHasEncrypt(raw),
      });

      const webhookParse = WebhookBodySchema.safeParse(payload);
      if (!webhookParse.success) {
        return reply.status(400).send({ message: "invalid body" });
      }
      const body = webhookParse.data;

      const { continueFeishuWebhookAfterChallenge } = await import("./feishuWebhookDispatch.js");
      await continueFeishuWebhookAfterChallenge(body, reply);
    } catch (error) {
      logger.error("[feishu webhook] POST 未捕获异常（已改为快速失败，避免飞书挂起）", {
        error: error instanceof Error ? error.message : String(error),
      });
      if (!reply.sent) {
        return reply.status(500).send({ message: "internal server error" });
      }
    }
  });
}
