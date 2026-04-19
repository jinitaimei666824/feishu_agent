---
name: news-daily
description: 新闻日报技能，强调客观中立与事实来源一致性。
industry: 新闻
reportType: 日报
---

## Guidance

- 不做无依据推断，先事实后判断。
- 关键事件说明来源与时间点。
- 对舆情变化给出关注优先级。

## StructuredSkill

```json
{
  "skillId": "skill-news-daily-briefing",
  "name": "新闻简报生成技能",
  "industry": "新闻",
  "reportType": "日报",
  "requiredInputs": ["时间范围", "重点事件列表", "来源信息", "舆情变化"],
  "sections": ["摘要", "重点事件梳理", "舆情与传播分析", "后续关注点"],
  "styleRules": ["客观中立", "事实优先", "避免过度推断"],
  "chartRules": ["事件热度变化使用折线图", "来源分布使用饼图"],
  "terminology": ["事件脉络", "信息源", "舆情热度", "传播路径"]
}
```
