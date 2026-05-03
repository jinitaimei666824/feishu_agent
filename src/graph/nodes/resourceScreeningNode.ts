import { ResourcePoolManager } from "../../services/resourcePool/poolManager.js";
import { screenResources } from "../../services/resourcePool/screening.js";
import type { ReportGraphStateType } from "../state.js";

const poolManager = new ResourcePoolManager();

export async function resourceScreeningNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.taskRequest) {
    throw new Error("resource_screening 缺少 taskRequest");
  }

  const resourcePool = await poolManager.buildResourcePool(state.taskRequest.userRequest);
  const candidateResources = await screenResources({
    request: state.taskRequest.userRequest,
    resourcePool,
  });

  return {
    resourcePool,
    candidateResources,
    debugTrace: [
      `[resource_screening] pool=${resourcePool.length}`,
      `[resource_screening] candidates=${candidateResources.candidates.length} llm_fallback=${candidateResources.usedLlmFallback}`,
    ],
  };
}
