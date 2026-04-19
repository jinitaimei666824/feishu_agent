---
name: medical-weekly
description: 医疗领域周报技能，强调质量合规、指标趋势与行动闭环。
industry: 医疗
reportType: 周报
---

## Guidance

- 用管理层可读语言，先结论后细节。
- 涉及医疗质量、合规或风险时，明确风险级别和责任动作。
- 指标描述尽量量化，避免模糊表述。

## StructuredSkill

```json
{
  "skillId": "skill-medical-weekly-report",
  "name": "医疗运营周报技能",
  "industry": "医疗",
  "reportType": "周报",
  "requiredInputs": ["统计周期", "门诊量", "住院量", "重点事项"],
  "sections": ["执行摘要", "核心指标表现", "重点事项进展", "风险与行动项"],
  "styleRules": ["专业审慎", "数据优先", "强调合规与质量"],
  "chartRules": ["趋势指标使用折线图", "科室对比使用柱状图"],
  "terminology": ["门急诊人次", "平均住院日", "病床周转率", "医疗质量"]
}
```
