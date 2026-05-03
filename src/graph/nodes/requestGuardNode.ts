import { guardRequest } from "../../services/agent/requestGuard.js";
import type { ReportGraphStateType } from "../state.js";

export async function requestGuardNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.userRequest) {
    throw new Error("request_guard 缺少 userRequest");
  }

  const taskRequest = guardRequest(state.userRequest);
  if (!taskRequest.isValid) {
    throw new Error(
      `${taskRequest.invalidReason ?? "无效请求"}${taskRequest.guardHints.length ? `：${taskRequest.guardHints.join("；")}` : ""}`,
    );
  }

  return {
    taskRequest,
    debugTrace: [
      `[request_guard] request accepted id=${taskRequest.requestId}`,
      `[request_guard] level=${taskRequest.validityLevel}`,
    ],
  };
}
