import { ResourceSummarySchema, type ResourceSummary } from "../schemas/agentContracts.js";
import { parseJsonFromMd } from "../services/retrieval/mdParser.js";
import { ResourcePoolStore } from "../storage/resourcePoolStore.js";

type RawAsset = {
  sourceId: string;
  sourceType: "message" | "doc" | "table";
  content: string;
};

function mapAssetToSummary(asset: RawAsset): ResourceSummary {
  const resourceType =
    asset.sourceType === "doc"
      ? "doc_summary"
      : asset.sourceType === "table"
        ? "table_summary"
        : "message_thread_summary";

  return ResourceSummarySchema.parse({
    resourceId: asset.sourceId,
    resourceType,
    title: asset.sourceId,
    summary: asset.content,
    project: asset.content.includes("医疗") ? "医疗运营" : "通用项目",
    tags: [asset.sourceType],
    keywords: asset.content.split(/[，。,\s]/).filter(Boolean).slice(0, 8),
    updatedAt: new Date().toISOString(),
  });
}

export async function runResourceGovernanceSync(): Promise<{
  totalResources: number;
  updatedAt: string;
}> {
  const assets = parseJsonFromMd<RawAsset[]>("src/data/assets.md");
  const summaries = assets.map(mapAssetToSummary);
  const store = new ResourcePoolStore();
  store.saveAll(summaries);

  return {
    totalResources: summaries.length,
    updatedAt: new Date().toISOString(),
  };
}
