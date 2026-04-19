import { UserRequestSchema } from "../../schemas/index.js";
import { normalizeText } from "../../shared/utils.js";
import type { ReportGraphStateType } from "../state.js";

export async function parseUserRequest(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  const parsed = UserRequestSchema.parse(state.userRequest);
  const normalized = UserRequestSchema.parse({
    ...parsed,
    prompt: normalizeText(parsed.prompt),
    extraContext: parsed.extraContext?.map(normalizeText),
    personalKnowledge: parsed.personalKnowledge?.map(normalizeText),
    historyDocs: parsed.historyDocs?.map(normalizeText),
  });

  return {
    userRequest: normalized,
    debugTrace: [
      `[parse_user_request] request validated for session=${normalized.sessionId}`,
    ],
  };
}
