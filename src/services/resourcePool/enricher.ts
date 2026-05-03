import { ResourcePoolChangeSchema, type ResourcePoolChange } from "../../schemas/agentContracts.js";
import type { UserRequest } from "../../schemas/index.js";
import { ResourcePoolStore } from "../../storage/resourcePoolStore.js";
import { ResourceSummarySchema } from "../../schemas/agentContracts.js";

export function buildResourcePoolChange(input: {
  request: UserRequest;
  usedResourceIds: string[];
  missingFields: string[];
}): ResourcePoolChange {
  const addedResourceIds = input.request.extraContext.map(
    (_, idx) => `extra_ctx_${idx + 1}_${input.request.sessionId}`,
  );

  const change = ResourcePoolChangeSchema.parse({
    addedResourceIds,
    updatedResourceIds: input.usedResourceIds.slice(0, 5),
    reason:
      input.missingFields.length > 0
        ? "记录本次缺失字段并标记高价值资源，供后续筛选使用"
        : "记录高价值资源关系，提升后续任务召回质量",
  });

  const store = new ResourcePoolStore();
  const syntheticResources = change.addedResourceIds.map((id) =>
    ResourceSummarySchema.parse({
      resourceId: id,
      resourceType: "project_memory",
      title: `任务补充资料 ${id}`,
      summary: `session=${input.request.sessionId} user=${input.request.userId}`,
      project: input.request.industry ?? "通用项目",
      tags: ["generated", "task_extra_context"],
      keywords: input.request.extraContext.slice(0, 8),
      updatedAt: new Date().toISOString(),
    }),
  );
  if (syntheticResources.length > 0) {
    store.upsert(syntheticResources);
  }

  return change;
}
