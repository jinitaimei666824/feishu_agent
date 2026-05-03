import type { ResourceSummary } from "../../schemas/agentContracts.js";
import type { UserRequest } from "../../schemas/index.js";
import { parseJsonFromMd } from "../retrieval/mdParser.js";
import { runResourceGovernanceSync } from "../../sync/resourceGovernance.js";
import { ResourcePoolStore } from "../../storage/resourcePoolStore.js";
import { toolGateway } from "../toolGateway/gateway.js";

type RawAsset = {
  sourceId: string;
  sourceType: "message" | "doc" | "table";
  content: string;
};

function inferResourceType(sourceType: RawAsset["sourceType"]): ResourceSummary["resourceType"] {
  if (sourceType === "doc") return "doc_summary";
  if (sourceType === "table") return "table_summary";
  return "message_thread_summary";
}

function inferProject(text: string): string {
  if (text.includes("医疗")) return "医疗运营";
  if (text.includes("竞品") || text.includes("市场")) return "市场增长";
  return "通用项目";
}

export class ResourcePoolManager {
  private readonly assets: RawAsset[];
  private readonly store: ResourcePoolStore;

  constructor() {
    this.assets = parseJsonFromMd<RawAsset[]>("src/data/assets.md");
    this.store = new ResourcePoolStore();
  }

  async buildResourcePool(request: UserRequest): Promise<ResourceSummary[]> {
    let persistedPool = this.store.loadAll();
    if (persistedPool.length === 0) {
      await runResourceGovernanceSync();
      persistedPool = this.store.loadAll();
    }

    const basePool: ResourceSummary[] = (persistedPool.length > 0 ? persistedPool : this.assets.map((asset) => ({
      resourceId: asset.sourceId,
      resourceType: inferResourceType(asset.sourceType),
      title: asset.sourceId,
      summary: asset.content,
      project: inferProject(asset.content),
      tags: [asset.sourceType, inferProject(asset.content)],
      keywords: asset.content.split(/[，。,\s]/).filter(Boolean).slice(0, 8),
      updatedAt: new Date().toISOString(),
    })));

    const contactResources: ResourceSummary[] = [];
    for (const [idx, contact] of request.imContacts.entries()) {
      const remoteProfile = await toolGateway.getUserInfo(contact.id).catch(() => null);
      contactResources.push({
        resourceId: `contact_${idx + 1}_${contact.id}`,
        resourceType: "contact_summary",
        title: `${remoteProfile?.name ?? contact.name} 联系人信息`,
        summary: `姓名=${remoteProfile?.name ?? contact.name} 角色=${remoteProfile?.role ?? contact.role ?? "未知"} id=${contact.id}`,
        project: request.industry ?? "通用项目",
        tags: ["contact", remoteProfile?.role ?? contact.role ?? "unknown"],
        keywords: [remoteProfile?.name ?? contact.name, remoteProfile?.role ?? contact.role ?? "联系人"],
      });
    }

    const historyResources: ResourceSummary[] = request.historyDocs.map((doc, idx) => ({
      resourceId: `history_${idx + 1}`,
      resourceType: "project_memory",
      title: `历史材料 ${idx + 1}`,
      summary: doc,
      project: request.industry ?? "通用项目",
      tags: ["history"],
      keywords: doc.split(/[，。,\s]/).filter(Boolean).slice(0, 8),
    }));

    return [...basePool, ...contactResources, ...historyResources];
  }
}
