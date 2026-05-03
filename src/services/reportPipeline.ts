import { reportGraph } from "../graph/reportGraph.js";
import {
  UserRequestSchema,
  type TaskPlan,
  type UserRequest,
  type WriterOutput,
} from "../schemas/index.js";
import type {
  ComplianceReviewResult,
  ExecutionPlan,
  FinalDeliverable,
  IntentResult,
  MemoryUpdate,
  ResourcePoolChange,
  SkillMatch,
  StyleReviewResult,
} from "../schemas/agentContracts.js";

type ReportPipelineResult = {
  selectedSkillId?: string;
  taskIntent?: string;
  intent?: IntentResult;
  skillMatch?: SkillMatch;
  executionPlan?: ExecutionPlan;
  taskPlan?: TaskPlan;
  followUpQuestions?: string[];
  styleReview?: StyleReviewResult;
  complianceReview?: ComplianceReviewResult;
  reviewNotes?: string[];
  finalDeliverable?: FinalDeliverable;
  memoryUpdate?: MemoryUpdate;
  resourcePoolChange?: ResourcePoolChange;
  outputTargets?: Array<"feishu_doc" | "bitable" | "slides">;
  report: WriterOutput;
  debugTrace?: string[];
};

export async function generateReport(
  userRequest: UserRequest,
): Promise<WriterOutput> {
  const request = UserRequestSchema.parse(userRequest);
  const state = await reportGraph.invoke({
    userRequest: request,
  });

  if (!state.writerOutput) {
    throw new Error("报告生成失败：writerOutput 为空");
  }
  return state.writerOutput;
}

export async function runReportPipeline(
  userRequest: UserRequest,
): Promise<ReportPipelineResult> {
  const request = UserRequestSchema.parse(userRequest);
  const state = await reportGraph.invoke({
    userRequest: request,
  });

  if (!state.writerOutput || !state.executionPlan) {
    throw new Error("报告生成失败：缺少核心输出");
  }

  return {
    selectedSkillId: state.executionPlan.selectedSkillId,
    taskIntent: state.intentResult?.taskIntent ?? state.taskIntent ?? undefined,
    intent: state.intentResult ?? undefined,
    skillMatch: state.skillMatch ?? undefined,
    executionPlan: state.executionPlan ?? undefined,
    taskPlan: state.taskPlan ?? undefined,
    followUpQuestions:
      state.executionPlan.followUpQuestions.length > 0
        ? state.executionPlan.followUpQuestions
        : undefined,
    styleReview: state.styleReviewResult ?? undefined,
    complianceReview: state.complianceReviewResult ?? undefined,
    reviewNotes: state.complianceReviewResult?.issues?.length
      ? state.complianceReviewResult.issues
      : state.styleReviewResult?.issues?.length
        ? state.styleReviewResult.issues
        : undefined,
    finalDeliverable: state.finalDeliverable ?? undefined,
    memoryUpdate: state.memoryUpdate ?? undefined,
    resourcePoolChange: state.resourcePoolChange ?? undefined,
    outputTargets:
      request.outputTargets.length > 0 ? request.outputTargets : ["feishu_doc"],
    report: state.writerOutput,
    debugTrace: state.debugTrace.length > 0 ? state.debugTrace : undefined,
  };
}
