import type { ReportGraphStateType } from "../state.js";

export async function reviewerNode(
  state: ReportGraphStateType,
): Promise<Partial<ReportGraphStateType>> {
  if (!state.writerOutput || !state.taskPlan) {
    throw new Error("reviewer_node 缺少 writerOutput/taskPlan");
  }

  const uncoveredSections = state.taskPlan.targetSections.filter(
    (target) => !state.writerOutput!.sections.some((s) => s.heading.includes(target)),
  );
  const reviewNotes = [
    ...uncoveredSections.map((name) => `缺少目标章节：${name}`),
    ...(state.writerOutput.openQuestions.length > 0
      ? ["存在待补充问题，建议通过 IM 自动追问后重生成"]
      : []),
  ];

  return {
    reviewNotes,
    debugTrace: [
      `[reviewer_node] review completed notes=${reviewNotes.length}`,
    ],
  };
}
