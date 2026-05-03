import { updateMemoryFromRun } from "../../services/agent/memoryUpdater.js";
import type { ReportGraphStateType } from "../state.js";

export async function memoryUpdateNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.taskRequest || !state.draft) {
    throw new Error("memory_update 缺少 taskRequest/draft");
  }

  const memoryUpdate = updateMemoryFromRun({
    request: state.taskRequest.userRequest,
    draft: state.draft,
  });

  return {
    memoryUpdate,
    debugTrace: [
      `[memory_update] updated=${memoryUpdate.updated} learned=${memoryUpdate.learnedPreferences.length}`,
    ],
  };
}
