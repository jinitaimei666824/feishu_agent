import { generateWriterOutput } from "../../llm/writerModel.js";
import type { ReportGraphStateType } from "../state.js";

export async function writerNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.writerInput) {
    throw new Error("writer_node 缺少 writerInput");
  }

  const writerOutput = await generateWriterOutput(state.writerInput);

  return {
    writerOutput,
    debugTrace: [
      `[writer_node] report generated title=${writerOutput.title}`,
    ],
  };
}
