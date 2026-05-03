import { StyleReviewResultSchema, type Draft, type StyleReviewResult } from "../../schemas/agentContracts.js";
import { invokeJsonModel } from "../../llm/jsonModel.js";
import {
  buildStyleReviewSystemPrompt,
  buildStyleReviewUserPrompt,
} from "../../prompts/reviewPrompts.js";

function fallbackStyleReview(input: {
  draft: Draft;
  preferredTone?: string;
}): StyleReviewResult {
  const issues: string[] = [];
  if ((input.preferredTone ?? "").includes("简洁") && input.draft.summary.length > 220) {
    issues.push("摘要偏长，不符合简洁风格");
  }

  return StyleReviewResultSchema.parse({
    pass: issues.length === 0,
    issues,
    suggestions: issues.length > 0 ? ["压缩摘要，使用结论先行句式"] : [],
  });
}

export async function reviewStyle(input: {
  draft: Draft;
  preferredTone?: string;
  styleNotes: string[];
}): Promise<StyleReviewResult> {
  try {
    const result = await invokeJsonModel(StyleReviewResultSchema, {
      systemPrompt: buildStyleReviewSystemPrompt(),
      userPrompt: buildStyleReviewUserPrompt(input),
    });
    return StyleReviewResultSchema.parse(result);
  } catch {
    return fallbackStyleReview(input);
  }
}
