import type { WriterInput } from "../schemas/index.js";

export function buildWriterSystemPrompt(): string {
  return [
    "你是企业办公报告生成流程中的 Writer/Analyst。",
    "请根据输入生成结构化报告内容。",
    "必须输出严格 JSON，不要输出任何解释文本。",
    "禁止使用 markdown 包裹 JSON。",
    "输出字段必须完整且类型正确：",
    "{",
    '  "title": string,',
    '  "summary": string,',
    '  "sections": [{"heading": string, "content": string}],',
    '  "chartSuggestions": [{"type": string, "title": string, "purpose": string, "dataHint": string}],',
    '  "openQuestions": string[]',
    "}",
  ].join("\n");
}

export function buildWriterUserPrompt(writerInput: WriterInput): string {
  const skillHints = writerInput.retrievalContext.styleHints.filter(
    (line) => line.startsWith("SKILL_GUIDE:") || line.startsWith("SKILL_DESC:"),
  );

  return [
    "请依据以下 WriterInput 生成报告 JSON：",
    JSON.stringify(writerInput),
    `skillHints=${JSON.stringify(skillHints)}`,
    "要求：",
    "1) summary 要有管理层可读的结论性表达",
    "2) sections 需覆盖 taskPlan.targetSections",
    "3) chartSuggestions 与 chartRules、数据语义一致",
    "4) 明确遵循 skillHints 中的自然语言指导（若有）",
    "5) openQuestions 填写仍缺失的信息点",
    "6) 仅输出 JSON 对象",
  ].join("\n");
}
