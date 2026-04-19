import { Packer, Paragraph, TextRun, Document, HeadingLevel } from "docx";
import type { TaskPlan, WriterOutput } from "../schemas/index.js";

export async function generateReportDocxBuffer(input: {
  report: WriterOutput;
  taskPlan?: TaskPlan;
  debugTrace?: string[];
}): Promise<Buffer> {
  const sectionParagraphs: Paragraph[] = [
    new Paragraph({
      text: input.report.title,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [new TextRun({ text: "摘要", bold: true })],
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph(input.report.summary),
  ];

  for (const section of input.report.sections) {
    sectionParagraphs.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_1,
      }),
    );
    sectionParagraphs.push(new Paragraph(section.content));
  }

  if (input.report.chartSuggestions.length > 0) {
    sectionParagraphs.push(
      new Paragraph({
        text: "图表建议",
        heading: HeadingLevel.HEADING_1,
      }),
    );
    for (const chart of input.report.chartSuggestions) {
      sectionParagraphs.push(
        new Paragraph(
          `- ${chart.title}（${chart.type}）：${chart.purpose}；数据建议：${chart.dataHint}`,
        ),
      );
    }
  }

  if (input.report.openQuestions.length > 0) {
    sectionParagraphs.push(
      new Paragraph({
        text: "待补充问题",
        heading: HeadingLevel.HEADING_1,
      }),
    );
    for (const q of input.report.openQuestions) {
      sectionParagraphs.push(new Paragraph(`- ${q}`));
    }
  }

  if (input.taskPlan) {
    sectionParagraphs.push(
      new Paragraph({
        text: "执行计划摘要",
        heading: HeadingLevel.HEADING_1,
      }),
    );
    sectionParagraphs.push(
      new Paragraph(
        `报告类型：${input.taskPlan.reportType}；技能：${input.taskPlan.selectedSkillId}；语气：${input.taskPlan.targetTone}`,
      ),
    );
  }

  if (input.debugTrace && input.debugTrace.length > 0) {
    sectionParagraphs.push(
      new Paragraph({
        text: "流程追踪",
        heading: HeadingLevel.HEADING_1,
      }),
    );
    for (const trace of input.debugTrace) {
      sectionParagraphs.push(new Paragraph(`- ${trace}`));
    }
  }

  const doc = new Document({
    sections: [
      {
        children: sectionParagraphs,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
