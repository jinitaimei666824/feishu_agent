import { TaskRequestSchema, type TaskRequest } from "../../schemas/agentContracts.js";
import { UserRequestSchema, type UserRequest } from "../../schemas/index.js";
import { normalizeText } from "../../shared/utils.js";

export function guardRequest(userRequest: UserRequest): TaskRequest {
  const parsed = UserRequestSchema.parse(userRequest);
  const normalizedPrompt = normalizeText(parsed.prompt);
  const guardHints: string[] = [];
  const hasActionVerb =
    /(生成|输出|整理|分析|汇总|复盘|写|做|制作|评估|report|analy|summar)/i.test(
      normalizedPrompt,
    );
  const isTooShort = normalizedPrompt.length < 6;
  const isLikelyChatOnly = !hasActionVerb && normalizedPrompt.length < 20;
  const isValid = !isTooShort && !isLikelyChatOnly;
  const validityLevel = isValid
    ? "accepted"
    : isTooShort
      ? "needs_clarification"
      : "rejected";

  if (isTooShort) guardHints.push("请补充任务目标、时间范围、输出形式");
  if (isLikelyChatOnly) guardHints.push("当前输入更像闲聊，请明确可执行任务");

  return TaskRequestSchema.parse({
    requestId: `${parsed.sessionId}-${Date.now()}`,
    receivedAt: new Date().toISOString(),
    userRequest: parsed,
    normalizedPrompt,
    isValid,
    validityLevel,
    guardHints,
    invalidReason: isValid ? undefined : "任务描述过短，请补充目标和范围",
  });
}
