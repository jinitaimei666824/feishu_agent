import type { Draft } from "../../schemas/agentContracts.js";
import { toolGateway } from "../toolGateway/gateway.js";

export type PublishedArtifact = {
  type: "feishu_doc" | "bitable" | "slides";
  id: string;
  url: string;
  status: "mock_published";
};

function renderDraftAsPlainText(draft: Draft): string {
  const sectionText = draft.sections
    .map((section) => `${section.heading}\n${section.content}`)
    .join("\n\n");
  const chartText =
    draft.chartSuggestions.length > 0
      ? `\n\n图表建议:\n${draft.chartSuggestions
          .map((item) => `- ${item.title}(${item.type})：${item.purpose}，数据建议：${item.dataHint}`)
          .join("\n")}`
      : "";
  return `${draft.title}\n\n摘要：${draft.summary}\n\n${sectionText}${chartText}`.trim();
}

export async function publishOutputs(input: {
  draft: Draft;
  outputTargets: Array<"feishu_doc" | "bitable" | "slides">;
  sessionId: string;
}): Promise<PublishedArtifact[]> {
  const artifacts: PublishedArtifact[] = [];

  for (const [idx, target] of input.outputTargets.entries()) {
    if (target === "feishu_doc") {
      const doc = await toolGateway.createDocument({
        title: input.draft.title,
        content: renderDraftAsPlainText(input.draft),
      });
      await toolGateway.updateDocument({
        documentId: doc.id,
        content: renderDraftAsPlainText(input.draft),
      });
      await toolGateway.addComment({
        documentId: doc.id,
        content: "由 Agent 自动生成，可在此处继续批注修改。",
      });
      artifacts.push({
        type: "feishu_doc",
        id: doc.id,
        url: doc.url ?? `https://mock.feishu.local/feishu_doc/${input.sessionId}/${idx + 1}`,
        status: "mock_published",
      });
      continue;
    }

    artifacts.push({
      type: target,
      id: `${target}_${input.sessionId}_${idx + 1}`,
      url: `https://mock.feishu.local/${target}/${input.sessionId}/${idx + 1}`,
      status: "mock_published",
    });
  }

  return artifacts;
}
