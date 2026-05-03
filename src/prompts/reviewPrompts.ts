import type {
  AnalysisResult,
  Draft,
  ExecutionPlan,
  SkillMatch,
} from "../schemas/agentContracts.js";
import type { UserRequest } from "../schemas/index.js";

export function buildWriterSystemPrompt(): string {
  return [
    "你是 Writer Agent。",
    "请根据计划、分析结果和 skill 约束生成结构化初稿。",
    "仅输出 JSON。",
  ].join("\n");
}

export function buildWriterUserPrompt(input: {
  userRequest: UserRequest;
  plan: ExecutionPlan;
  analysis: AnalysisResult;
  skillMatch: SkillMatch;
  rewriteHints?: string[];
}): string {
  return [
    "请生成初稿。",
    `userRequest=${JSON.stringify(input.userRequest)}`,
    `plan=${JSON.stringify(input.plan)}`,
    `analysis=${JSON.stringify(input.analysis)}`,
    `skillMatch=${JSON.stringify(input.skillMatch)}`,
    `rewriteHints=${JSON.stringify(input.rewriteHints ?? [])}`,
  ].join("\n");
}

export function buildStyleReviewSystemPrompt(): string {
  return [
    "你是 Style Reviewer。",
    "只评估风格与语气，不评估事实正确性。",
    "仅输出 JSON。",
  ].join("\n");
}

export function buildStyleReviewUserPrompt(input: {
  draft: Draft;
  preferredTone?: string;
  styleNotes: string[];
}): string {
  return [
    "请做风格审查。",
    `draft=${JSON.stringify(input.draft)}`,
    `preferredTone=${input.preferredTone ?? ""}`,
    `styleNotes=${JSON.stringify(input.styleNotes)}`,
  ].join("\n");
}

export function buildComplianceSystemPrompt(): string {
  return [
    "你是 Compliance Reviewer。",
    "请检查结构完整性、术语一致性、必填项和数据口径。",
    "issueType 仅允许 planner_gap/data_quality/ok。",
    "仅输出 JSON。",
  ].join("\n");
}

export function buildComplianceUserPrompt(input: {
  draft: Draft;
  plan: ExecutionPlan;
  requiredInputs: string[];
  terminology: string[];
}): string {
  return [
    "请进行规范审查。",
    `draft=${JSON.stringify(input.draft)}`,
    `plan=${JSON.stringify(input.plan)}`,
    `requiredInputs=${JSON.stringify(input.requiredInputs)}`,
    `terminology=${JSON.stringify(input.terminology)}`,
  ].join("\n");
}
