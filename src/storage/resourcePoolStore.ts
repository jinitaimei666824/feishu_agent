import fs from "node:fs";
import path from "node:path";
import { ResourceSummarySchema, type ResourceSummary } from "../schemas/agentContracts.js";

const RESOURCE_POOL_FILE = path.resolve(process.cwd(), "src", "data", "resource-pool.json");

type ResourcePoolSnapshot = {
  updatedAt: string;
  resources: ResourceSummary[];
};

function readSnapshot(): ResourcePoolSnapshot {
  if (!fs.existsSync(RESOURCE_POOL_FILE)) {
    return { updatedAt: new Date(0).toISOString(), resources: [] };
  }

  const raw = fs.readFileSync(RESOURCE_POOL_FILE, "utf-8");
  const json = JSON.parse(raw) as ResourcePoolSnapshot;
  return {
    updatedAt: json.updatedAt ?? new Date(0).toISOString(),
    resources: Array.isArray(json.resources)
      ? json.resources.map((item) => ResourceSummarySchema.parse(item))
      : [],
  };
}

function writeSnapshot(snapshot: ResourcePoolSnapshot): void {
  fs.mkdirSync(path.dirname(RESOURCE_POOL_FILE), { recursive: true });
  fs.writeFileSync(RESOURCE_POOL_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
}

export class ResourcePoolStore {
  loadAll(): ResourceSummary[] {
    return readSnapshot().resources;
  }

  saveAll(resources: ResourceSummary[]): void {
    writeSnapshot({
      updatedAt: new Date().toISOString(),
      resources: resources.map((item) => ResourceSummarySchema.parse(item)),
    });
  }

  upsert(resources: ResourceSummary[]): void {
    const snapshot = readSnapshot();
    const map = new Map(snapshot.resources.map((item) => [item.resourceId, item]));
    for (const resource of resources) {
      map.set(resource.resourceId, ResourceSummarySchema.parse(resource));
    }
    writeSnapshot({
      updatedAt: new Date().toISOString(),
      resources: Array.from(map.values()),
    });
  }
}
