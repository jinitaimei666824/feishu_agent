import { env } from "../config/env.js";
import { WriterOutputSchema, type WriterInput, type WriterOutput } from "../schemas/index.js";
import { extractJsonObject } from "../shared/utils.js";
import { invokeBailianModel } from "./client.js";
import { buildWriterSystemPrompt, buildWriterUserPrompt } from "../prompts/writerPrompt.js";

export async function generateWriterOutput(
  writerInput: WriterInput,
): Promise<WriterOutput> {
  const raw = await invokeBailianModel({
    model: env.BAILIAN_MODEL_WRITER,
    systemPrompt: buildWriterSystemPrompt(),
    userPrompt: buildWriterUserPrompt(writerInput),
    jsonMode: true,
  });

  const json = extractJsonObject(raw);
  return WriterOutputSchema.parse(JSON.parse(json));
}
