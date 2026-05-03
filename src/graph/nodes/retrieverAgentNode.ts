import { deepRetrieveContext } from "../../services/retrieval/deepRetriever.js";
import type { ReportGraphStateType } from "../state.js";

export async function retrieverAgentNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.taskRequest || !state.executionPlan || !state.candidateResources) {
    throw new Error("retriever_agent 缺少前置状态");
  }

  const detailedContext = await deepRetrieveContext({
    request: state.taskRequest.userRequest,
    plan: state.executionPlan,
    screened: state.candidateResources,
  });

  return {
    detailedContext,
    debugTrace: [
      `[retriever_agent] facts=${detailedContext.facts.length} details=${detailedContext.sourceDetails.length}`,
    ],
  };
}
