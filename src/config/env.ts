import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  BAILIAN_API_KEY: z.string().min(1, "BAILIAN_API_KEY 未配置"),
  BAILIAN_BASE_URL: z.string().url("BAILIAN_BASE_URL 必须是 URL"),
  BAILIAN_MODEL_ORCHESTRATOR: z.string().min(1),
  BAILIAN_MODEL_WRITER: z.string().min(1),
  BAILIAN_MODEL_EMBEDDING: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LLM_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30000),
  // Phase1 飞书主链路（未配置时 /api/phase1/mvp 会报错，但不影响 /generate-report）
  FEISHU_BASE_URL: z.string().url().default("https://open.feishu.cn"),
  FEISHU_APP_ID: z.string().default(""),
  FEISHU_APP_SECRET: z.string().default(""),
  FEISHU_TEMPLATE_FILE_TOKEN: z.string().default(""),
  FEISHU_TARGET_FOLDER_TOKEN: z.string().default(""),
  FEISHU_COPY_NAME_PREFIX: z.string().default("AI报告-"),
  /** 选填：MVP 完成后通过机器人发回链接的目标会话（群 chat_id） */
  FEISHU_IM_NOTIFY_CHAT_ID: z.string().default(""),
});

export const env = EnvSchema.parse(process.env);
