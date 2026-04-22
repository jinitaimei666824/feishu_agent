import { assertFeishuMvpConfig, type FeishuMvpConfig } from "../integrations/feishu/feishuConfig.js";
import { copyTemplateDocx } from "../integrations/feishu/driveCopy.js";
import {
  listAllDocumentBlocks,
  replaceBlockWithPlainText,
} from "../integrations/feishu/docxBlocks.js";
import { sendTextMessage } from "../integrations/feishu/imMessage.js";
import { logger } from "../shared/logger.js";
import { DEFAULT_SECTIONS, locateSectionBlocks, type SectionDef } from "./sectionAnchors.js";
import { generateSectionContent } from "./llmSection.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Phase1MvpInput = {
  userText: string;
  /** 若提供则发 IM；否则与 FEISHU_IM_NOTIFY_CHAT_ID 二选一在路由层处理 */
  chatId?: string;
  sections?: SectionDef[];
};

export type Phase1MvpResult = {
  documentId: string;
  docUrl: string;
  copyName: string;
  filled: Array<{ key: string; label: string; blockId: string }>;
  missingAnchors: string[];
  imSent: boolean;
  debug: string[];
};

/**
 * 主链路：选模板(环境变量) → 复制 → 读块 → 按锚点找 section → 逐节调模型 → 写回 → 可选发群消息
 */
export async function runPhase1Mvp(
  input: Phase1MvpInput,
  configOverride?: FeishuMvpConfig,
): Promise<Phase1MvpResult> {
  const c = configOverride ?? assertFeishuMvpConfig();
  const debug: string[] = [];
  const sections = input.sections ?? DEFAULT_SECTIONS;

  const copyName = `${c.copyNamePrefix}${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19)}`;
  debug.push(`[phase1] copy from template=${c.templateFileToken} name=${copyName}`);

  // 与 driveCopy 内日志一起对照：这里明确打印 .env 中两项及即将使用的 type
  logger.info("[phase1] copyTemplateDocx 调用前（.env）", {
    FEISHU_TEMPLATE_FILE_TOKEN: c.templateFileToken,
    FEISHU_TARGET_FOLDER_TOKEN: c.targetFolderToken,
    copyBodyType: "docx",
  });

  const copied = await copyTemplateDocx(c, {
    sourceFileToken: c.templateFileToken,
    targetFolderToken: c.targetFolderToken,
    name: copyName,
  });
  if (!copied.url) {
    logger.warn("飞书 copy 未返回 url，将仅返回 documentId");
  }

  const blocks = await listAllDocumentBlocks(c, copied.documentId);
  debug.push(`[phase1] blocks count=${blocks.length}`);

  const located = locateSectionBlocks(blocks, sections);
  const missingAnchors: string[] = [];
  const filled: Phase1MvpResult["filled"] = [];

  for (const s of sections) {
    const hit = located.get(s.key);
    if (!hit) {
      missingAnchors.push(s.key);
      continue;
    }
    const body = await generateSectionContent({
      userText: input.userText,
      sectionKey: s.key,
      sectionLabel: s.label,
    });
    const merged = `【${s.label}】\n\n${body.trim()}`;
    await replaceBlockWithPlainText(c, copied.documentId, hit.blockId, merged);
    filled.push({ key: s.key, label: s.label, blockId: hit.blockId });
    debug.push(`[phase1] filled section ${s.key} block=${hit.blockId}`);
    await sleep(450);
  }

  const targetChat = input.chatId?.trim() || c.imNotifyChatId;
  let imSent = false;
  if (targetChat && copied.url) {
    await sendTextMessage(c, {
      receiveId: targetChat,
      text: `已生成云文档，点击打开：${copied.url}`,
    });
    imSent = true;
  }

  return {
    documentId: copied.documentId,
    docUrl: copied.url,
    copyName,
    filled,
    missingAnchors,
    imSent,
    debug,
  };
}
