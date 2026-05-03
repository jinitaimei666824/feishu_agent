import { MemoryUpdateSchema, type Draft, type MemoryUpdate } from "../../schemas/agentContracts.js";
import type { UserRequest } from "../../schemas/index.js";
import { MemoryStore } from "../../storage/memoryStore.js";

export function updateMemoryFromRun(input: {
  request: UserRequest;
  draft: Draft;
}): MemoryUpdate {
  const learnedPreferences: string[] = [];
  if (input.draft.summary.length < 120) {
    learnedPreferences.push("偏好短摘要");
  }
  if (input.draft.sections.some((section) => section.heading.includes("行动"))) {
    learnedPreferences.push("偏好行动导向结构");
  }

  const memoryStore = new MemoryStore();
  memoryStore.upsert(input.request.userId, {
    preferredTone: input.draft.summary.length < 120 ? "简洁结论先行" : undefined,
    styleNotes: learnedPreferences,
    commonTerms: input.draft.sections
      .flatMap((section) => section.content.split(/[，。,\s]/))
      .filter((token) => token.length >= 4)
      .slice(0, 8),
  });

  return MemoryUpdateSchema.parse({
    updated: learnedPreferences.length > 0,
    learnedPreferences,
  });
}
