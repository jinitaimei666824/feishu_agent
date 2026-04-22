import type { BlockItem } from "../integrations/feishu/docxBlocks.js";
import { blockPlainText } from "../integrations/feishu/docxBlocks.js";

export type SectionDef = { key: string; label: string };

/** 与模板中 [SECTION:KEY] 一致；第一版写死，后续可从配置读取 */
export const DEFAULT_SECTIONS: SectionDef[] = [
  { key: "EXEC_SUMMARY", label: "执行摘要" },
  { key: "KEY_FINDINGS", label: "关键发现" },
  { key: "DATA_ANALYSIS", label: "数据分析" },
  { key: "RECOMMENDATIONS", label: "建议与行动" },
];

const anchorRe = (key: string) =>
  new RegExp(`\\[SECTION:${key}\\]`, "i");

export function locateSectionBlocks(
  blocks: BlockItem[],
  sections: SectionDef[] = DEFAULT_SECTIONS,
): Map<string, { blockId: string; block: BlockItem }> {
  const found = new Map<string, { blockId: string; block: BlockItem }>();

  for (const b of blocks) {
    const id = b.block_id;
    if (!id) continue;
    const text = blockPlainText(b);
    for (const s of sections) {
      if (found.has(s.key)) continue;
      if (anchorRe(s.key).test(text)) {
        found.set(s.key, { blockId: id, block: b });
      }
    }
  }
  return found;
}
