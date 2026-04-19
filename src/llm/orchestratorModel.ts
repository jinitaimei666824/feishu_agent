import { env } from "../config/env.js";
import { TaskPlanSchema, type RetrievalContext, type TaskPlan, type UserRequest } from "../schemas/index.js";
import { extractJsonObject } from "../shared/utils.js";
import { invokeBailianModel } from "./client.js";
import { buildPlannerSystemPrompt, buildPlannerUserPrompt } from "../prompts/plannerPrompt.js";

export async function generateTaskPlan(
  userRequest: UserRequest,
  retrievalContext: RetrievalContext,
): Promise<TaskPlan> {
  const raw = await invokeBailianModel({
    model: env.BAILIAN_MODEL_ORCHESTRATOR,
    systemPrompt: buildPlannerSystemPrompt(),
    userPrompt: buildPlannerUserPrompt(userRequest, retrievalContext),
    jsonMode: true,
  });

  const json = extractJsonObject(raw);
  return TaskPlanSchema.parse(JSON.parse(json));
}
