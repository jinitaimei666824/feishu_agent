---
name: finance-analysis
description: 财经分析报告技能，强调量化表达、风险敞口与可执行建议。
industry: 财经
reportType: 分析报告
---

## Guidance

- 用数据说明结论，避免只给观点不给证据。
- 必须提示关键风险项及其可能影响范围。
- 建议部分给出优先级和执行时点。

## StructuredSkill

```json
{
  "skillId": "skill-finance-analysis-report",
  "name": "财经分析报告技能",
  "industry": "财经",
  "reportType": "分析报告",
  "requiredInputs": ["统计周期", "营收", "成本", "利润", "关键事件"],
  "sections": ["执行摘要", "财务指标分析", "市场与事件影响", "风险与展望"],
  "styleRules": ["结论先行", "量化表达", "避免主观夸张"],
  "chartRules": ["营收成本利润使用组合图", "趋势变化使用折线图"],
  "terminology": ["营收", "毛利率", "净利率", "现金流", "环比", "同比"]
}
```
