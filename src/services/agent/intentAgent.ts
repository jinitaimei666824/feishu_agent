import { IntentResultSchema, type CandidateResourceList, type IntentResult } from "../../schemas/agentContracts.js";
import type { UserRequest } from "../../schemas/index.js";
import { invokeJsonModel } from "../../llm/jsonModel.js";
import { buildIntentSystemPrompt, buildIntentUserPrompt } from "../../prompts/agentPrompts.js";

function fallbackIntent(userRequest: UserRequest): IntentResult {
  const text = userRequest.prompt.toLowerCase();
  const taskIntent = text.includes("周报")
    ? "weekly_report"
    : text.includes("日报")
      ? "daily_report"
      : text.includes("复盘")
        ? "project_review"
        : text.includes("分析")
          ? "analysis_report"
          : "general_task";

  return IntentResultSchema.parse({
    taskIntent,
    outputKind: text.includes("ppt") ? "ppt" : text.includes("canvas") ? "canvas" : "doc",
    industry: userRequest.industry ?? "通用",
    reportType: userRequest.reportType ?? "分析报告",
    initialGaps: [],
    confidence: 0.6,
  });
}

export async function detectIntentWithLlm(input: {
  userRequest: UserRequest;
  screened: CandidateResourceList;
}): Promise<IntentResult> {
  try {
    const result = await invokeJsonModel(IntentResultSchema, {
      systemPrompt: buildIntentSystemPrompt(),
      userPrompt: buildIntentUserPrompt(input.userRequest, input.screened),
    });
    return IntentResultSchema.parse(result);
  } catch {
    return fallbackIntent(input.userRequest);
  }
}
