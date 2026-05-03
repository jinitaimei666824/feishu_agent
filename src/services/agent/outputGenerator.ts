import { FinalDeliverableSchema, type Draft, type FinalDeliverable, type IntentResult } from "../../schemas/agentContracts.js";
import type { UserRequest } from "../../schemas/index.js";
import { publishOutputs } from "../output/publisher.js";

export async function generateFinalOutput(input: {
  request: UserRequest;
  intent: IntentResult;
  draft: Draft;
}): Promise<FinalDeliverable> {
  const outputKind = input.intent.outputKind;
  const publishedArtifacts = await publishOutputs({
    draft: input.draft,
    outputTargets: input.request.outputTargets,
    sessionId: input.request.sessionId,
  });

  return FinalDeliverableSchema.parse({
    outputKind,
    title: input.draft.title,
    content: input.draft,
    outputTargets: input.request.outputTargets,
    publishedArtifacts,
  });
}
