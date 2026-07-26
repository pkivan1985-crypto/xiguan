# Task 2 Report — 只读展示模型

## RED

执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm test -- --run src/features/load-daily-habits/model/loadDailyHabits.test.ts src/features/load-card-deck/model/loadCardDeck.test.ts
```

结果：exit 1；手算 fixture 的断言按预期失败，`DailyHabitsModel.outcomeDates` 与 `DeckView.archivedCount` 均为 `undefined`。修正测试 fixture 的系统模板 ID 后重跑，失败仅来自这两项新展示字段缺失（共 3 项失败）。

## GREEN / VERIFY

同一目标测试命令：exit 0，2 个测试文件、7 项测试通过。

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm test -- --run src/features/load-home-dashboard/model/loadHomeDashboard.test.ts src/features/load-history/model/loadHistory.test.ts
```

结果：exit 0，2 个测试文件、11 项测试通过。

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm run build
```

结果：exit 0；`tsc -b`、全量 Vitest（75 个测试文件、277 项测试）和 Vite/PWA 构建均通过。Vite 保留既有的大 chunk 警告。

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm run lint
```

结果：exit 1；唯一 error 位于任务范围外的 `src/widgets/habit-glyph/ui/HabitGlyph.test.tsx:28`（`no-misleading-character-class`），另有 11 个既有 warning。本任务未修改这些文件，未越界修复。

## 修改文件

- `src/features/load-daily-habits/model/loadDailyHabits.ts`
- `src/features/load-daily-habits/model/loadDailyHabits.test.ts`
- `src/features/load-card-deck/model/loadCardDeck.ts`
- `src/features/load-card-deck/model/loadCardDeck.test.ts`
- `.superpowers/sdd/2026-07-26-r4-three-screen-faithful-redesign/task-2-report.md`

## 实现与自审

- `DailyHabitsModel` 返回按有效 `actionRecords` 去重排序的 `outcomeDates`；归档卡不在今日习惯列表中，但其历史日期仍保留。
- 每张活跃习惯返回当日值（既有 `quantityBaseValue`）、`totalQuantityBaseValue` 和 `activeDays`；当前目标仍只统计关联到当前目标的记录。
- `DeckView.archivedCount` 由只读事务中读取的真实 `userCards.status` 计数；活跃卡分类、排序和六槽草稿映射保持原有行为。
- 手算断言覆盖 3,000 当日值、5,500 累计值、3 个活跃日、50% 当前目标、归档历史日期和 1 张归档卡；测试未调用生产 helper 生成期望值。
- `git diff --check` 通过；变更路径检查确认 schema、备份结构和 `save-today-outcome` 写事务没有差异。

## 提交

本报告随同本地提交 `feat: expose faithful three-screen view data` 提交；最终提交哈希见任务交付。

## 关注点

- 全量 lint 目前被任务范围外的既有 `HabitGlyph.test.tsx` 规则错误阻断；模型测试、回归测试和生产构建均通过。
