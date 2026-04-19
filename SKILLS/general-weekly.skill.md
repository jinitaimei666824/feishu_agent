---
name: general-weekly
description: 通用周报技能，适用于未命中行业专属 skill 的场景。
industry: 通用
reportType: 周报
---

## Guidance

- 表达遵循结论先行，避免过长背景铺垫。
- 行动项必须有责任角色与时间点。

## StructuredSkill

```json
{
  "skillId": "skill-general-weekly-report",
  "name": "通用周报技能",
  "industry": "通用",
  "reportType": "周报",
  "requiredInputs": ["统计周期", "核心指标", "重点事项"],
  "sections": ["执行摘要", "核心指标表现", "重点事项进展", "风险与行动项"],
  "styleRules": ["结论先行", "语言简洁", "尽量量化"],
  "chartRules": ["趋势项使用折线图", "对比项使用柱状图"],
  "terminology": ["关键指标", "同比", "环比", "风险闭环"]
}
```
