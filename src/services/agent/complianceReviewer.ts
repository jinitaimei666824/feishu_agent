import {
  ComplianceReviewResultSchema,
  type ComplianceReviewResult,
  type Draft,
  type ExecutionPlan,
} from "../../schemas/agentContracts.js";
import { invokeJsonModel } from "../../llm/jsonModel.js";
import {
  buildComplianceSystemPrompt,
  buildComplianceUserPrompt,
} from "../../prompts/reviewPrompts.js";

function fallbackCompliance(input: {
  draft: Draft;
  plan: ExecutionPlan;
  requiredInputs: string[];
  terminology: string[];
}): ComplianceReviewResult {
  const issues: string[] = [];
  const missingSections = input.plan.targetSections.filter(
    (section) => !input.draft.sections.some((item) => item.heading.includes(section)),
  );
  if (missingSections.length > 0) {
    issues.push(`缺少章节: ${missingSections.join("、")}`);
  }
  if (input.plan.missingFields.length > 0) {
    issues.push(`仍存在缺失字段: ${input.plan.missingFields.join("、")}`);
  }

  if (issues.length > 0) {
    return ComplianceReviewResultSchema.parse({
      pass: false,
      issueType: "planner_gap",
      issues,
    });
  }

  return ComplianceReviewResultSchema.parse({
    pass: true,
    issueType: "ok",
    issues: [],
  });
}

export async function reviewCompliance(input: {
  draft: Draft;
  plan: ExecutionPlan;
  requiredInputs: string[];
  terminology: string[];
}): Promise<ComplianceReviewResult> {
  try {
    const result = await invokeJsonModel(ComplianceReviewResultSchema, {
      systemPrompt: buildComplianceSystemPrompt(),
      userPrompt: buildComplianceUserPrompt(input),
    });
    return ComplianceReviewResultSchema.parse(result);
  } catch {
    return fallbackCompliance(input);
  }
}
