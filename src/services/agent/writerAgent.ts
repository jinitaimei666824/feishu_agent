import { env } from "../../config/env.js";
import {
  DraftSchema,
  type AnalysisResult,
  type Draft,
  type ExecutionPlan,
  type SkillMatch,
} from "../../schemas/agentContracts.js";
import type { UserRequest } from "../../schemas/index.js";
import { invokeJsonModel } from "../../llm/jsonModel.js";
import { buildWriterSystemPrompt, buildWriterUserPrompt } from "../../prompts/reviewPrompts.js";

function fallbackDraft(input: {
  userRequest: UserRequest;
  plan: ExecutionPlan;
  analysis: AnalysisResult;
}): Draft {
  const sections = input.plan.targetSections.map((section, idx) => ({
    heading: section,
    content:
      input.analysis.keyInsights[idx] ??
      input.analysis.normalizedFacts[idx] ??
      `请围绕 ${section} 补充事实证据`,
  }));

  return DraftSchema.parse({
    format: "doc",
    title: `${input.plan.reportType} - ${input.userRequest.sessionId}`,
    summary: input.analysis.keyInsights[0] ?? "请补充执行摘要结论",
    sections,
    chartSuggestions: input.analysis.chartSuggestions,
    openQuestions: input.plan.missingFields,
  });
}

export async function writeDraft(input: {
  userRequest: UserRequest;
  plan: ExecutionPlan;
  analysis: AnalysisResult;
  skillMatch: SkillMatch;
  rewriteHints?: string[];
}): Promise<Draft> {
  try {
    const result = await invokeJsonModel(DraftSchema, {
      model: env.BAILIAN_MODEL_WRITER,
      systemPrompt: buildWriterSystemPrompt(),
      userPrompt: buildWriterUserPrompt(input),
    });
    return DraftSchema.parse(result);
  } catch {
    return fallbackDraft(input);
  }
}
