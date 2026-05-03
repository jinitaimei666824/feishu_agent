import {
  ExecutionPlanSchema,
  type CandidateResourceList,
  type ExecutionPlan,
  type IntentResult,
  type SkillMatch,
} from "../../schemas/agentContracts.js";
import type { UserRequest } from "../../schemas/index.js";
import { invokeJsonModel } from "../../llm/jsonModel.js";
import { buildPlannerSystemPrompt, buildPlannerUserPrompt } from "../../prompts/agentPrompts.js";

function fallbackPlan(input: {
  userRequest: UserRequest;
  intent: IntentResult;
  skillMatch: SkillMatch;
  screened: CandidateResourceList;
}): ExecutionPlan {
  const missingFields = input.skillMatch.selectedSkill.requiredInputs.filter(
    (field) => !input.userRequest.prompt.includes(field),
  );

  return ExecutionPlanSchema.parse({
    reportType: input.intent.reportType,
    selectedSkillId: input.skillMatch.selectedSkill.skillId,
    targetSections: input.skillMatch.selectedSkill.sections,
    targetTone: "专业、清晰",
    prioritizedResourceIds: input.screened.candidates.slice(0, 5).map((r) => r.resourceId),
    missingFields,
    followUpQuestions: missingFields.map((field) => `请补充：${field}`),
    retrievalStrategy: "优先读取高分资源，再补读相关联系人与历史项目资料",
  });
}

export async function generateExecutionPlan(input: {
  userRequest: UserRequest;
  intent: IntentResult;
  skillMatch: SkillMatch;
  screened: CandidateResourceList;
}): Promise<ExecutionPlan> {
  try {
    const result = await invokeJsonModel(ExecutionPlanSchema, {
      systemPrompt: buildPlannerSystemPrompt(),
      userPrompt: buildPlannerUserPrompt(input),
    });
    return ExecutionPlanSchema.parse(result);
  } catch {
    return fallbackPlan(input);
  }
}
