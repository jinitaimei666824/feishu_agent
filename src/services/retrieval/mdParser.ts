import fs from "node:fs";
import path from "node:path";
import type { Skill } from "../../schemas/index.js";

/**
 * Retrieval 模块专属：从 Markdown 中提取 JSON
 */
export function parseJsonFromMd<T>(filePath: string): T {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    // 1. 兜底策略：如果整个文件是纯 JSON，直接解析
    try {
      return JSON.parse(content.trim()) as T;
    } catch (e) {
      // 不是纯JSON，继续执行
    }

    // 2. 健壮版正则：匹配 Markdown 中的 ```json ... ``` 代码块
    const regex = /```json\s*([\s\S]*?)\s*```/;
    const match = content.match(regex);

    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim()) as T;
      } catch (jsonError: any) {
        throw new Error(`找到JSON代码块，但格式错误: ${jsonError.message}`);
      }
    }

    throw new Error("未找到 JSON 代码块，请检查 md 文件格式。");
  } catch (error) {
    console.error(`读取或解析 MD 文件失败: ${filePath}`, error);
    throw error;
  }
}

export type SkillDocMeta = {
  name: string;
  description: string;
  metadata: Record<string, string>;
};

export type SkillDoc = {
  skill: Skill;
  meta: SkillDocMeta;
  guidance: string[];
  sourcePath: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferIndustry(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("医疗") || lower.includes("medical")) return "医疗";
  if (lower.includes("财经") || lower.includes("金融") || lower.includes("finance")) return "财经";
  if (lower.includes("新闻") || lower.includes("news")) return "新闻";
  if (lower.includes("体育") || lower.includes("sports") || lower.includes("sport")) return "体育";
  return "通用";
}

function inferReportType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("周报") || lower.includes("weekly")) return "周报";
  if (lower.includes("日报") || lower.includes("daily")) return "日报";
  if (lower.includes("赛事")) return "赛事报告";
  if (lower.includes("news")) return "日报";
  if (lower.includes("analysis") || lower.includes("analyst") || lower.includes("分析")) {
    return "分析报告";
  }
  return "分析报告";
}

function buildSkillFromUnstructuredDoc(input: {
  filePath: string;
  meta: SkillDocMeta;
  guidance: string[];
}): Skill {
  const joined = `${input.filePath}\n${input.meta.name}\n${input.meta.description}\n${input.guidance.join("\n")}`;
  const industry = inferIndustry(joined);
  const reportType = inferReportType(joined);
  const baseName = input.meta.name || path.basename(input.filePath, path.extname(input.filePath));
  const skillId = `skill-${slugify(baseName) || "generic"}-${slugify(reportType) || "report"}`;

  const defaultSections =
    reportType === "日报"
      ? ["摘要", "重点事件", "事实核验", "后续关注"]
      : reportType === "周报"
        ? ["执行摘要", "核心指标表现", "重点事项进展", "风险与行动项"]
        : reportType === "赛事报告"
          ? ["赛事摘要", "核心数据分析", "关键转折", "建议与复盘"]
          : ["执行摘要", "核心分析", "关键结论", "行动建议"];

  return {
    skillId,
    name: baseName,
    industry,
    reportType,
    requiredInputs: ["目标", "时间范围", "关键事实"],
    sections: defaultSections,
    styleRules: input.guidance.slice(0, 8),
    chartRules: ["趋势类建议折线图", "对比类建议柱状图"],
    terminology: [],
  };
}

function parseFrontMatter(markdown: string): SkillDocMeta {
  const match = markdown.match(/^---\s*([\s\S]*?)\s*---/);
  if (!match?.[1]) {
    return { name: "", description: "", metadata: {} };
  }

  const lines = match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const metadata: Record<string, string> = {};
  let name = "";
  let description = "";

  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const rawValue = line.slice(idx + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (key === "name") name = value;
    else if (key === "description") description = value;
    else metadata[key] = value;
  }

  return { name, description, metadata };
}

function extractGuidance(markdown: string): string[] {
  const section =
    markdown.match(/##\s*Guidance\s*([\s\S]*?)(\n##\s|$)/i)?.[1] ??
    markdown.match(/##\s*指导\s*([\s\S]*?)(\n##\s|$)/i)?.[1] ??
    "";

  return section
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => Boolean(line) && !line.startsWith("```"));
}

function extractSkillJson(markdown: string): string {
  const jsonBlock = markdown.match(
    /```(?:json|skill-json)\s*([\s\S]*?)\s*```/i,
  )?.[1];
  if (jsonBlock) return jsonBlock.trim();

  const objectMatch = markdown.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) return objectMatch[0].trim();

  throw new Error("未找到技能 JSON 结构块");
}

export function parseSkillDocFromMd(filePath: string): SkillDoc {
  const fullPath = path.resolve(process.cwd(), filePath);
  const content = fs.readFileSync(fullPath, "utf-8");

  const meta = parseFrontMatter(content);
  const guidance = extractGuidance(content);
  let skill: Skill;
  try {
    const jsonText = extractSkillJson(content);
    skill = JSON.parse(jsonText) as Skill;
  } catch {
    skill = buildSkillFromUnstructuredDoc({
      filePath,
      meta,
      guidance,
    });
  }

  return {
    skill,
    meta,
    guidance,
    sourcePath: filePath,
  };
}