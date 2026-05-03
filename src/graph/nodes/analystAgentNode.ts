import { analyzeContext } from "../../services/agent/analystAgent.js";
import type { ReportGraphStateType } from "../state.js";

export async function analystAgentNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.executionPlan || !state.detailedContext) {
    throw new Error("analyst_agent 缺少 executionPlan/detailedContext");
  }

  const analysisResult = await analyzeContext({
    plan: state.executionPlan,
    context: state.detailedContext,
  });

  return {
    analysisResult,
    debugTrace: [
      `[analyst_agent] insights=${analysisResult.keyInsights.length} charts=${analysisResult.chartSuggestions.length}`,
    ],
  };
}
