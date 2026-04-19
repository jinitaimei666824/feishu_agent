---
name: sports-event
description: 体育赛事报告技能，强调比赛关键转折与数据对照分析。
industry: 体育
reportType: 赛事报告
---

## Guidance

- 先给比赛结论，再解释关键转折。
- 指标描述优先使用对比语句，突出变化。
- 改进建议需对应到可执行训练或战术动作。

## StructuredSkill

```json
{
  "skillId": "skill-sports-event-report",
  "name": "体育赛事报告技能",
  "industry": "体育",
  "reportType": "赛事报告",
  "requiredInputs": ["赛事周期", "关键比赛结果", "球员数据", "战术观察"],
  "sections": ["赛事摘要", "核心数据分析", "关键战术复盘", "问题与改进方向"],
  "styleRules": ["简洁有力", "数据佐证观点", "突出关键转折"],
  "chartRules": ["比赛走势使用折线图", "球员对比使用雷达图"],
  "terminology": ["控球率", "有效进攻", "关键传球", "防守强度"]
}
```
