import { generateTaskPlan } from "../../llm/orchestratorModel.js";
import type { ReportGraphStateType } from "../state.js";

export async function analystNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.userRequest || !state.retrievalContext) {
    throw new Error("analyst_node 缺少 userRequest/retrievalContext");
  }

  const taskPlan = await generateTaskPlan(state.userRequest, state.retrievalContext);
  const followUpQuestions = taskPlan.missingFields.map(
    (field) => `请补充字段：${field}（可通过 IM 联系人收集）`,
  );

  return {
    taskPlan,
    followUpQuestions,
    debugTrace: [
      `[analyst_node] normalized metrics and planned sections=${taskPlan.targetSections.length}`,
      `[analyst_node] follow-up questions=${followUpQuestions.length}`,
    ],
  };
}
