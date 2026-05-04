import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  /** 未配置时进程可启动；实际调用 LLM 时在 client 层报错 */
  BAILIAN_API_KEY: z.string().default(""),
  BAILIAN_BASE_URL: z
    .string()
    .url("BAILIAN_BASE_URL 必须是 URL")
    .default("https://dashscope.aliyuncs.com/compatible-mode/v1"),
  BAILIAN_MODEL_ORCHESTRATOR: z.string().default("qwen2.5-vl-72b-instruct"),
  BAILIAN_MODEL_WRITER: z.string().default("qwen2.5-7b-instruct"),
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
  /** Tool Gateway: 飞书官方 MCP endpoint（留空则自动走 fallback adapter） */
  FEISHU_MCP_URL: z.string().default(""),
  /** Tool Gateway: MCP 工具白名单，逗号分隔 */
  FEISHU_MCP_ALLOWED_TOOLS: z.string().default(
    "search-docs,fetch-doc,list-docs,get-file-content,create-doc,update-doc,get-comments,add-comment,search-users,get-user-info",
  ),
  /**
   * 飞书机器人 webhook（/api/feishu/webhook）收到 IM 文本后走哪条链路：
   * - full：LangGraph 全链路 runReportPipeline，会话内分条回文字报告
   * - phase1：复制云文档模板并按锚点填小节，回交互卡片链
   */
  FEISHU_BOT_PIPELINE: z.enum(["full", "phase1"]).default("full"),
  /**
   * 可写数据目录（runtime-memories.json、resource-pool.json）。
   * 不设且 VERCEL=1 时默认 /tmp/feishu-agent-data；本地默认 src/data。
   */
  FEISHU_WRITABLE_DATA_DIR: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
