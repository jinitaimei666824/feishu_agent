import { DetailedContextSchema, type CandidateResourceList, type DetailedContext, type ExecutionPlan } from "../../schemas/agentContracts.js";
import type { UserRequest } from "../../schemas/index.js";
import { parseJsonFromMd } from "./mdParser.js";
import { toolGateway } from "../toolGateway/gateway.js";

type RawAsset = {
  sourceId: string;
  sourceType: "message" | "doc" | "table";
  content: string;
};

function toFact(sourceId: string, content: string) {
  return {
    sourceId,
    fact: content,
    evidence: `来自资源 ${sourceId}`,
  };
}

export async function deepRetrieveContext(input: {
  request: UserRequest;
  plan: ExecutionPlan;
  screened: CandidateResourceList;
}): Promise<DetailedContext> {
  const assets = parseJsonFromMd<RawAsset[]>("src/data/assets.md");
  const idSet = new Set(input.plan.prioritizedResourceIds);
  const screenedSet = new Set(input.screened.candidates.map((r) => r.resourceId));
  const selectedIds = new Set([...idSet, ...screenedSet]);

  const matchedAssets = assets.filter((item) => selectedIds.has(item.sourceId));
  const assetFacts = matchedAssets.map((item) => toFact(item.sourceId, item.content));

  const candidateDocs = input.screened.candidates.filter(
    (item) =>
      item.resourceType === "doc_summary" ||
      item.resourceType === "project_memory" ||
      item.resourceType === "table_summary",
  );

  const externalFacts: Array<{ sourceId: string; fact: string; evidence?: string }> = [];
  const externalDetails: Array<{ resourceId: string; detail: string }> = [];

  for (const doc of candidateDocs.slice(0, 6)) {
    const rawId = doc.resourceId.startsWith("ext_doc_")
      ? doc.resourceId.replace("ext_doc_", "")
      : doc.resourceId;
    const viewed = await toolGateway.viewDocument(rawId);
    if (viewed?.content) {
      externalFacts.push(toFact(doc.resourceId, viewed.content.slice(0, 500)));
      externalDetails.push({
        resourceId: doc.resourceId,
        detail: viewed.content,
      });
    } else {
      const content = await toolGateway.getFileContent(rawId);
      if (content) {
        externalFacts.push(toFact(doc.resourceId, content.slice(0, 500)));
        externalDetails.push({
          resourceId: doc.resourceId,
          detail: content,
        });
      }
    }

    const comments = await toolGateway.getComments(rawId);
    for (const comment of comments.slice(0, 3)) {
      externalFacts.push(
        toFact(doc.resourceId, `评论(${comment.author ?? "匿名"}): ${comment.content}`),
      );
    }
  }

  const historyFacts = input.request.historyDocs.map((doc, idx) =>
    toFact(`history_doc_${idx + 1}`, doc),
  );

  const contactFacts = input.request.imContacts.map((contact, idx) =>
    toFact(
      `im_contact_${idx + 1}`,
      `联系人 ${contact.name}(${contact.id}) 角色=${contact.role ?? "未知"} 可用于补充任务字段`,
    ),
  );

  return DetailedContextSchema.parse({
    facts: [...assetFacts, ...externalFacts, ...historyFacts, ...contactFacts],
    sourceDetails: [
      ...matchedAssets.map((asset) => ({
        resourceId: asset.sourceId,
        detail: asset.content,
      })),
      ...externalDetails,
      ...input.request.personalKnowledge.map((item, idx) => ({
        resourceId: `pk_${idx + 1}`,
        detail: item,
      })),
    ],
  });
}
