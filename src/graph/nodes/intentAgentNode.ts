import { detectIntentWithLlm } from "../../services/agent/intentAgent.js";
import type { ReportGraphStateType } from "../state.js";

export async function intentAgentNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.taskRequest || !state.candidateResources) {
    throw new Error("intent_agent 缺少 taskRequest/candidateResources");
  }

  const intentResult = await detectIntentWithLlm({
    userRequest: state.taskRequest.userRequest,
    screened: state.candidateResources,
  });

  return {
    intentResult,
    taskIntent: intentResult.taskIntent,
    debugTrace: [
      `[intent_agent] intent=${intentResult.taskIntent} output=${intentResult.outputKind}`,
    ],
  };
}
