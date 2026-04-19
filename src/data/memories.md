# 用户记忆库 (User Memories)

记录用户的偏好与风格，实现“越用越聪明”。Key 为 userId。

```json
{
  "user_alice_001": {
    "preferredTone": "极简、高效、结果导向",
    "preferredStructure": ["核心结论", "数据支撑", "后续行动"],
    "commonTerms": ["底层逻辑", "颗粒度", "价值闭环"],
    "styleNotes": ["段落前加粗标题", "不使用形容词", "所有百分比保留两位小数"]
  },
  "user_bob_002": {
    "preferredTone": "叙述性强、注重逻辑推导",
    "preferredStructure": ["现状背景", "逻辑拆解", "详细建议"],
    "commonTerms": ["维度", "对标", "结构性机会"],
    "styleNotes": ["多使用引用块", "喜欢用‘综上所述’做总结"]
  }
}
```
