# R4 三屏高保真忠实重做实施计划

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to execute this plan task by task.

**Goal:** 在不改变本地数据、目标计算、备份格式和 PWA 边界的前提下，把“今天 / 进展 / 习惯”三屏忠实重做为用户批准的三张手机高保真稿。

**Architecture:** 保留现有 Feature-Sliced 数据与业务层，先补齐只读展示模型，再重建三屏展示层。三屏共用移动端视觉令牌、页面头部、习惯图标和底部导航；页面专用面板留在对应 page/widget，避免为一次性布局建立通用框架。

**Tech Stack:** React 19.2.7、TypeScript 6.0.3、CSS Modules、React Router 7.18.1、Dexie 4.4.4、Vitest 4.1.10、Testing Library、`react-icons/pi`

**Design source:** `docs/superpowers/specs/2026-07-26-r4-three-screen-faithful-redesign-design.md`、`docs/superpowers/specs/2026-07-26-r4-three-screen-visual-acceptance.md` 与其中链接的 Figma 文件。三张用户参考图是唯一视觉标准。

## Global Constraints

- 基准内容视口是 `390 × 844`；水平安全边距 `16px`；一级区块间距 `16px`；主要圆角 `18px`，大型面板 `22px`。
- 页面背景 `#071417`；主卡 `#0E2027`；次卡 `#132932`；主蓝 `#2594FF`；完成绿 `#7AD64A`；阅读橙 `#FFB03B`；生活紫 `#AD78FF`；主文字 `#F5F8FB`；辅助文字 `#97A8B8`；分隔与轨道 `#1F3841`。
- 页面标题 `24px / 700`；区块标题 `18px / 700`；卡片主标题 `16px / 700`；正文和主要数据 `15—16px`；辅助文字 `13px`；仅极次要元数据可用 `12px`。
- 习惯主图标容器 `44—52px`；底部导航图标 `24px`；所有主要触控区不小于 `44 × 44px`。
- 使用 `react-icons/pi` 的真实图标；禁止 Emoji、文字符号、手绘 SVG、CSS 图形和把参考图作为页面背景。
- Android 与 iPhone 共用同一套手机优先 PWA；不得新增账号、后端、云同步、远程数据库或运行时 AI。
- 不修改 IndexedDB schema、备份格式、行动记录事实来源、同日覆盖规则、目标计算或 PWA 离线规则。
- 不修改版本号，不创建 RC，不推送 GitHub，不部署 Cloudflare Pages。
- 三屏必须使用真实业务数据和可工作的核心交互；没有现成业务能力的视觉动作不得伪装成可用功能。
- 用户本轮批准的 R4 设计继续采用当前已实现的“单项即时保存”主流程；这是最新页面规则，覆盖旧宪法中六卡槽作为主记录入口的旧画面，但不删除旧批次数据能力。
- 不新增 DOM 测试依赖或修改 `vite.config.ts`；交互状态优先提取为纯函数测试，结构由纯展示组件 SSR 测试，真实点击由 390 × 844 浏览器 QA 验证。
- 每个实现任务严格执行 RED → GREEN → REFACTOR；先看到目标测试因缺失行为失败，再写最小生产代码。
- 只修改本计划列出的文件或完成同一边界所必需的相邻测试/翻译文件；不得清理无关代码。

## Task 1: 建立三屏共用移动视觉骨架

**Files:**

- Modify: `src/app/styles/index.css`
- Modify: `src/widgets/app-shell/ui/AppShell.tsx`
- Modify: `src/widgets/app-shell/ui/AppShell.module.css`
- Modify: `src/widgets/app-shell/model/appShellRoute.ts`
- Modify: `src/widgets/app-shell/model/appShellRoute.test.ts`
- Create: `src/widgets/app-shell/ui/AppShell.test.tsx`
- Create: `src/widgets/mobile-page-header/index.ts`
- Create: `src/widgets/mobile-page-header/ui/MobilePageHeader.tsx`
- Create: `src/widgets/mobile-page-header/ui/MobilePageHeader.module.css`
- Create: `src/widgets/habit-glyph/index.ts`
- Create: `src/widgets/habit-glyph/ui/HabitGlyph.tsx`
- Create: `src/widgets/habit-glyph/ui/HabitGlyph.module.css`
- Create: `src/widgets/habit-glyph/ui/HabitGlyph.test.tsx`

**Step 1: RED**

- 在 `AppShell.test.tsx` 用真实 `Outlet` 内容断言三个主路由不再叠加旧粘性标题；底部导航仍只有“今天 / 进展 / 习惯”，选中项可识别。此任务只建立 `MobilePageHeader`；今天、进展、习惯三页分别在 Tasks 3—5 接入并由各自页面测试负责。
- 在 `HabitGlyph.test.tsx` 用五种真实 `iconKey + accent` 断言生成可访问的 Phosphor 图标容器，不输出 Emoji 或文字符号。
- 运行：
  `powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm test -- --run src/widgets/app-shell/ui/AppShell.test.tsx src/widgets/habit-glyph/ui/HabitGlyph.test.tsx`
- 预期：测试因页面自有头部规则和 `HabitGlyph` 尚不存在而失败。

**Step 2: GREEN**

- 把 R4 色彩、字体、间距和表面令牌加入全局样式，不破坏设置、数据管理等旧页面的现有变量别名。
- 主路由由页面渲染 `MobilePageHeader`；设置和其他二级页继续使用旧 AppShell 标题，避免回归。
- 底部导航按参考图固定为三项，导航高度为 `72px + safe area`，图标使用 `react-icons/pi`。
- `HabitGlyph` 只负责图标、色彩和尺寸，不读取数据库、不决定业务文案。

**Step 3: VERIFY / REFACTOR**

- 重跑两项测试并运行：
  `powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm run lint:css`
- 删除重复令牌和单次使用抽象，保持页面层仍可独立排版。
- Commit: `feat: establish faithful mobile visual shell`

## Task 2: 补齐三屏所需的只读展示模型

**Files:**

- Modify: `src/features/load-daily-habits/model/loadDailyHabits.ts`
- Modify: `src/features/load-daily-habits/model/loadDailyHabits.test.ts`
- Modify: `src/features/load-card-deck/model/loadCardDeck.ts`
- Modify: `src/features/load-card-deck/model/loadCardDeck.test.ts`
- Modify only if required by typed exports: `src/features/load-daily-habits/index.ts`
- Modify only if required by typed exports: `src/features/load-card-deck/index.ts`

**Step 1: RED**

- 在 `loadDailyHabits.test.ts` 增加手算 fixture，断言：
  - 返回一周日期条所需的真实成果日期；
  - 每张习惯返回当天值、累计值、活跃天数和当前目标进度；
  - 归档卡不进入今天列表，但其历史成果日仍保留。
- 在 `loadCardDeck.test.ts` 断言：
  - 活跃卡按分类和排序返回；
  - 归档卡不进入活跃卡网格，但 `archivedCount` 正确；
  - 目标进度仍只使用与当前目标关联的行动记录。
- 运行：
  `powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm test -- --run src/features/load-daily-habits/model/loadDailyHabits.test.ts src/features/load-card-deck/model/loadCardDeck.test.ts`
- 预期：因新字段不存在而失败，且失败值来自手算 fixture。

**Step 2: GREEN**

- 在现有只读事务中派生展示字段；不得新增表、索引或持久化字段。
- 成果日期、累计值和活跃天数均从 `actionRecords` 派生。
- `archivedCount` 从真实 `userCards.status` 派生；现有六卡槽和活跃卡行为保持不变。

**Step 3: VERIFY / REFACTOR**

- 重跑两项测试以及：
  `powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm test -- --run src/features/load-home-dashboard/model/loadHomeDashboard.test.ts src/features/load-history/model/loadHistory.test.ts`
- 确认未改变 schema、写入事务和备份结构。
- Commit: `feat: expose faithful three-screen view data`

## Task 3: 忠实重做“今天”页面

**Files:**

- Modify: `src/pages/today/ui/TodayPage.tsx`
- Modify: `src/pages/today/ui/TodayPage.module.css`
- Modify: `src/pages/today/ui/TodayPage.test.tsx`
- Modify: `src/widgets/week-strip/ui/WeekStrip.tsx`
- Modify: `src/widgets/week-strip/ui/WeekStrip.module.css`
- Modify: `src/widgets/week-strip/model/buildWeekDays.ts`
- Modify: `src/widgets/week-strip/model/buildWeekDays.test.ts`
- Create: `src/widgets/today-habit-panel/index.ts`
- Create: `src/widgets/today-habit-panel/ui/TodayHabitPanel.tsx`
- Create: `src/widgets/today-habit-panel/ui/TodayHabitPanel.module.css`
- Create: `src/widgets/today-habit-panel/ui/TodayHabitPanel.test.tsx`
- Modify: `src/shared/lib/i18n/locales/zh.json`
- Modify: `src/shared/lib/i18n/locales/en.json`

**Step 1: RED**

- 为周日期条写失败测试：七列、选中日蓝色状态、有成果日真实图标标记、未来日禁用、过去日可跳转进展页。
- 为 `TodayHabitPanel` 写失败测试：五种追踪类型显示正确控制；所有习惯位于一个大面板并用分隔线区分；已完成项可折叠；行内保存失败只影响对应习惯。
- 为 `TodayPage` 写失败测试：页面头部含本地日期；完成概览、进度条、本地保存说明、统一主面板和“查看今日汇总 / 新建习惯”双入口同时存在。
- 运行：
  `powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm test -- --run src/pages/today/ui/TodayPage.test.tsx src/widgets/week-strip src/widgets/today-habit-panel`
- 预期：旧分离小卡结构不能满足断言。

**Step 2: GREEN**

- 按参考稿顺序实现：头部 → 周日期条 → 完成概览 → 单一习惯面板 → 已完成折叠行 → 双动作。
- 数值类保留减/加；次数类保留加号；时长类保留记录动作；完成/避免类保留圆形完成与撤销。
- 保存中只锁当前行；保存失败在当前行显示；所有现有 `saveDailyHabitInApp` 语义保持不变。
- 空状态保留相同视觉框架和“新建习惯”入口。

**Step 3: VERIFY / REFACTOR**

- 重跑 Task 3 测试，并运行保存回归：
  `powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm test -- --run src/features/save-daily-habit src/features/save-today-outcome`
- 在 `390 × 844` 检查页面无横向溢出、无 9—11px 小字、无分离小卡回归。
- Commit: `feat: faithfully rebuild today screen`

## Task 4: 忠实重做“进展”页面

**Files:**

- Modify: `src/pages/progress/ui/ProgressPage.tsx`
- Modify: `src/pages/progress/ui/ProgressPage.module.css`
- Create: `src/pages/progress/ui/ProgressPage.test.tsx`
- Modify: `src/widgets/outcome-calendar/ui/OutcomeCalendar.tsx`
- Modify: `src/widgets/outcome-calendar/ui/OutcomeCalendar.module.css`
- Modify: `src/widgets/outcome-calendar/ui/OutcomeCalendar.test.tsx`
- Modify: `src/widgets/goal-summary/ui/GoalSummary.tsx`
- Modify: `src/widgets/goal-summary/ui/GoalSummary.module.css`
- Modify: `src/widgets/goal-summary/ui/GoalSummary.test.tsx`
- Modify: `src/shared/lib/i18n/locales/zh.json`
- Modify: `src/shared/lib/i18n/locales/en.json`

**Step 1: RED**

- 新增 `ProgressPage.test.tsx`，断言默认“月历”页签、完整月历大面板、所选日成果内嵌列表、总规划大面板和两条重点目标；明确断言旧三个统计小方块不存在。
- 扩展日历测试，断言成果日使用真实图标而不是 `✓` 文字符号，选中日、今天和禁用未来日期可区分。
- 扩展目标摘要测试，断言长期与阶段进度均显示真实当前值/目标值，没有目标的卡不伪造 `0%`。
- 运行：
  `powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm test -- --run src/pages/progress src/widgets/outcome-calendar src/widgets/goal-summary`
- 预期：当前三个统计小卡和分离记录面板导致测试失败。

**Step 2: GREEN**

- 实现“月历 / 目标”分段切换；默认月历，切换不改变路由数据。
- 将月份切换、日期网格、所选日成果和“查看详情”放进同一大型面板。
- 总规划显示进行中习惯数、本月成果日和至多两条有目标习惯；“查看全部目标”进入现有目标/习惯路径。
- 月份切换、选择日期和深链接查询参数保持可用。

**Step 3: VERIFY / REFACTOR**

- 重跑 Task 4 测试及 `loadHomeDashboard`、`loadHistory` 回归。
- 在 `390 × 844` 检查月历密度、日期触控、面板内层级和目标进度，不得恢复三个统计小方块。
- Commit: `feat: faithfully rebuild progress screen`

## Task 5: 忠实重做“习惯”页面

**Files:**

- Modify: `src/pages/deck/ui/DeckPage.tsx`
- Modify: `src/pages/deck/ui/DeckPage.module.css`
- Modify: `src/widgets/card-deck/ui/CardDeck.tsx`
- Modify: `src/widgets/card-deck/ui/CardDeck.module.css`
- Modify: `src/widgets/card-deck/ui/CardDeck.test.tsx`
- Modify: `src/widgets/card-deck/model/toggleExpandedItemId.ts`
- Modify if needed: `src/widgets/card-deck/model/toggleExpandedItemId.test.ts`
- Modify: `src/shared/lib/i18n/locales/zh.json`
- Modify: `src/shared/lib/i18n/locales/en.json`

**Step 1: RED**

- 重写 `CardDeck.test.tsx`，用纯状态函数和真实 SSR 组件断言：
  - 顶部筛选为“全部 / 运动 / 阅读 / 生活”，筛选只改变可见卡；
  - 第一张有目标的卡默认展开并独占整行；
  - 点击两列小卡后它展开、此前卡折叠；
  - 小卡显示图标、名称、每日参考值和真实进度/状态；
  - 无目标卡不显示虚假 `0%`；
  - 归档行显示真实数量。
- 增加 `DeckPage` 页面测试，断言标题、进行中/归档统计、设置入口和“新建习惯”都在参考位置。
- 运行：
  `powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm test -- --run src/pages/deck src/widgets/card-deck`
- 预期：当前分类手风琴结构和无归档计数导致失败。

**Step 2: GREEN**

- 移除分类手风琴，改为顶部分段筛选 + 一个展开主卡 + 两列紧凑卡。
- 展开卡显示每日目标、长期目标、阶段目标、两条进度、计划与收起；跳转只使用现有真实目标详情和新建路径，不伪造尚未存在的编辑能力。
- 归档只显示真实计数和独立行；若当前新数据层没有可用归档列表路由，保持为不可误导的只读摘要。
- 筛选和展开状态只保存在当前页面内，不写入 IndexedDB。

**Step 3: VERIFY / REFACTOR**

- 重跑 Task 5 测试及 `loadCardDeck` 回归。
- 在 `390 × 844` 检查首卡视觉重心、两列卡宽、图标比例、折叠/展开和长标题截断。
- 在真实浏览器补做筛选、切换展开卡和收起的点击验收。
- Commit: `feat: faithfully rebuild habits screen`

## Task 6: 三屏真实数据回归、视觉 QA 与最终审查

**Files:**

- Modify: `design-qa.md`
- Create/update only generated evidence: `.artifacts/r4-three-screen-faithful-redesign/**`
- Modify only when a verified P0/P1/P2 mismatch requires it: files from Tasks 1—5

**Step 1: AUTOMATED VERIFICATION**

- 运行：
  `powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm run lint`
- 运行：
  `powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm run lint:css`
- 运行：
  `powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm run build`
- 任何失败必须修复并重跑对应命令；不得把 warning 说成 pass。

**Step 2: FUNCTIONAL MOBILE QA**

- 使用现有本地浏览器和真实 IndexedDB 测试数据，在 `390 × 844` 逐屏验证：
  - 今天：加减、完成、撤销、过去日期跳转、汇总和新建；
  - 进展：切月、选日期、月历/目标切换、记录和目标跳转；
  - 习惯：筛选、默认展开、小卡展开、新建和目标详情；
  - 刷新后三屏数据仍存在，离线后已访问页面仍可打开。

**Step 3: VISUAL COMPARISON**

- 每屏用与参考图相同视口和相近数据状态截图。
- 每屏生成“参考图在左 / 实现图在右”的并排图，不得只看单张实现截图。
- 逐项检查结构、字号、间距、圆角、图标、颜色、数据密度、底部导航和安全区。
- P0：结构/主流程错误；P1：明显尺寸、层级或交互错误；P2：可见但轻微的视觉偏差。三类差异均清零后，`design-qa.md` 最后一行才可写 `final result: passed`。

**Step 4: FINAL REVIEW**

- 进行一次跨任务需求符合性和代码质量审查，检查未授权功能、数据边界、测试真实性、重复样式和无障碍。
- 重跑受最终修复影响的测试，然后运行最终 `npm run build`。
- Commit: `test: complete faithful three-screen qa`

## Completion Boundary

完成仅表示本地分支具备可验收的三屏重做：

- 不修改 `package.json` 版本；
- 不创建或推送远程分支、PR、Tag、Release；
- 不部署 Cloudflare Pages；
- 用户完成本地视觉验收后，再单独决定是否进入 RC 和发布流程。
