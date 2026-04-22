import { env } from "../config/env.js";
import { invokeBailianModel } from "../llm/client.js";

/**
 * 只生成一个 section 的正文，禁止整篇报告。
 */
export async function generateSectionContent(options: {
  userText: string;
  sectionKey: string;
  sectionLabel: string;
}): Promise<string> {
  return invokeBailianModel({
    model: env.BAILIAN_MODEL_WRITER,
    systemPrompt: [
      "你是企业周报/分析报告写作助手。",
      "【硬性要求】只写当前要求的这一节正文；不要写其它章节；不要写「以上是…」等套话。",
      "用专业、简明的现代汉语，可适当使用短句和分点（用 - 起行）。",
    ].join("\n"),
    userPrompt: [
      `【用户需求】`,
      options.userText,
      ``,
      `【本节标题含义】${options.sectionLabel}`,
      `【本节锚点】[SECTION:${options.sectionKey}]（不要在输出中重复该锚点）`,
      ``,
      `请只输出这一节的正文。`,
    ].join("\n"),
  });
}
