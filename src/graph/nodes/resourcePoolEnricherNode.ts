import { buildResourcePoolChange } from "../../services/resourcePool/enricher.js";
import type { ReportGraphStateType } from "../state.js";

export async function resourcePoolEnricherNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.taskRequest || !state.executionPlan || !state.candidateResources) {
    throw new Error("resource_pool_enricher 缺少 taskRequest/executionPlan/candidateResources");
  }

  const resourcePoolChange = buildResourcePoolChange({
    request: state.taskRequest.userRequest,
    usedResourceIds: state.candidateResources.candidates.map((r) => r.resourceId),
    missingFields: state.executionPlan.missingFields,
  });

  return {
    resourcePoolChange,
    debugTrace: [
      `[resource_pool_enricher] add=${resourcePoolChange.addedResourceIds.length} update=${resourcePoolChange.updatedResourceIds.length}`,
    ],
  };
}
