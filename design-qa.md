# R4 每日记录易用性重构——设计 QA（旧实现复核）

## 对照输入

- 选定方向：`design-qa-artifacts/reference-today.png`
- 实际实现：`design-qa-artifacts/implementation-today.png`
- 同屏对照：`design-qa-artifacts/r4-today-side-by-side.png`
- 验收视口：390 × 844

## 复核结论

- 旧实现只完成了信息架构和基础功能，没有忠实还原三张选定高保真图。
- “今天”错误地把统一主卡拆成多个普通小卡，字号、图标和操作尺寸过小。
- “进展”错误地增加三个统计小方块，并把月历和规划缩成普通列表。
- “习惯”错误地采用分类折叠列表，替代了筛选胶囊、展开主卡和两列小卡。
- 旧结论过度关注测试、无溢出和颜色方向，遗漏了结构、字号、间距、数据密度和层次差异。
- 2026-07-26 已建立新的 Figma 设计基线：
  `https://www.figma.com/design/yJruZylPTz7gfKnrK5Mm32?node-id=2-2`

## 后续通过条件

- 按 `docs/superpowers/specs/2026-07-26-r4-three-screen-faithful-redesign-design.md`
  完成三屏重做。
- 使用 390 × 844 相同视口和相近数据状态逐屏并排对照。
- P0/P1/P2 视觉差异清零后重新验收。

final result: blocked
