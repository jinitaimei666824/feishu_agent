import {
  AnalysisResultSchema,
  type AnalysisResult,
  type DetailedContext,
  type ExecutionPlan,
} from "../../schemas/agentContracts.js";
import { invokeJsonModel } from "../../llm/jsonModel.js";
import { buildAnalystSystemPrompt, buildAnalystUserPrompt } from "../../prompts/agentPrompts.js";

function fallbackAnalysis(input: {
  plan: ExecutionPlan;
  context: DetailedContext;
}): AnalysisResult {
  const normalizedFacts = input.context.facts.map((item) => item.fact);
  const keyInsights = normalizedFacts.slice(0, 3);
  return AnalysisResultSchema.parse({
    normalizedFacts,
    metricDefinitions: input.plan.targetSections.map((section) => `${section}: 使用统一统计周期口径`),
    keyInsights,
    chartSuggestions: [
      {
        type: "line",
        title: "关键指标趋势",
        purpose: "展示本周期变化趋势",
        dataHint: "按时间序列聚合关键指标",
      },
    ],
  });
}

export async function analyzeContext(input: {
  plan: ExecutionPlan;
  context: DetailedContext;
}): Promise<AnalysisResult> {
  try {
    const result = await invokeJsonModel(AnalysisResultSchema, {
      systemPrompt: buildAnalystSystemPrompt(),
      userPrompt: buildAnalystUserPrompt(input),
    });
    return AnalysisResultSchema.parse(result);
  } catch {
    return fallbackAnalysis(input);
  }
}
