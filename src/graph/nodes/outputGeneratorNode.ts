import { generateFinalOutput } from "../../services/agent/outputGenerator.js";
import type { ReportGraphStateType } from "../state.js";

export async function outputGeneratorNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.taskRequest || !state.intentResult || !state.draft) {
    throw new Error("output_generator 缺少 taskRequest/intentResult/draft");
  }

  const finalDeliverable = await generateFinalOutput({
    request: state.taskRequest.userRequest,
    intent: state.intentResult,
    draft: state.draft,
  });

  return {
    finalDeliverable,
    debugTrace: [
      `[output_generator] output=${finalDeliverable.outputKind} targets=${finalDeliverable.outputTargets.join(",")}`,
    ],
  };
}
