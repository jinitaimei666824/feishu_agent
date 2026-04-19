import type { ReportGraphStateType } from "../state.js";

function detectIntent(prompt: string): string {
  const text = prompt.toLowerCase();
  if (text.includes("周报") || text.includes("weekly")) return "weekly_report";
  if (text.includes("日报") || text.includes("daily")) return "daily_report";
  if (text.includes("复盘")) return "review_report";
  if (text.includes("分析")) return "analysis_report";
  return "general_report";
}

export async function intentNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.userRequest) {
    throw new Error("intent_node 缺少 userRequest");
  }

  const intent = detectIntent(state.userRequest.prompt);
  return {
    taskIntent: intent,
    debugTrace: [`[intent_node] detected intent=${intent}`],
  };
}
