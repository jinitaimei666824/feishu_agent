import type { RetrievalContext, UserRequest } from "../schemas/index.js";

export function buildPlannerSystemPrompt(): string {
  return [
    "你是企业办公报告流程中的 Orchestrator/Planner。",
    "你的职责只有：做计划与决策，不写长正文。",
    "必须输出严格 JSON，不要输出任何解释文本。",
    "禁止使用 markdown 包裹 JSON。",
    "输出字段必须完整且类型正确：",
    "{",
    '  "reportType": string,',
    '  "selectedSkillId": string,',
    '  "missingFields": string[],',
    '  "targetSections": string[],',
    '  "targetTone": string,',
    '  "useSources": string[]',
    "}",
  ].join("\n");
}

export function buildPlannerUserPrompt(
  userRequest: UserRequest,
  retrievalContext: RetrievalContext,
): string {
  return [
    "请根据以下输入生成 TaskPlan JSON：",
    `userRequest=${JSON.stringify(userRequest)}`,
    `retrievalContext=${JSON.stringify(retrievalContext)}`,
    `skillStyleHints=${JSON.stringify(retrievalContext.styleHints)}`,
    "要求：",
    "1) selectedSkillId 必须取 matchedSkill.skillId",
    "2) missingFields 根据 requiredInputs 与 userRequest 补全差异",
    "3) targetSections 优先沿用 skill.sections",
    "4) useSources 填写 projectContext 的 sourceId 列表",
    "5) targetTone 优先参考 userMemory.preferredTone 与 styleHints 中的 SKILL_GUIDE",
    "6) 仅输出 JSON 对象",
  ].join("\n");
}
