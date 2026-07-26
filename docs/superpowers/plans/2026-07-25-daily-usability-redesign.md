# 每日记录易用性重构实施计划

日期：2026-07-25  
分支：`project/r4-daily-usability-redesign`  
执行方式：单 Agent，本地实施，不发布

## 验收口径

- 三个一级页签“今天 / 进展 / 习惯”可用。
- 今天页自动加载进行中的习惯，并能单项即时保存和撤销。
- 进展页能切月、选日期、查看真实记录和目标规划。
- 习惯页保持两列折叠、单列展开，并能进入新建流程。
- 旧记录和旧备份不需要迁移即可读取。
- 单元测试、类型检查、生产构建与移动端视觉 QA 通过。

## 任务 1：固定新路由与应用壳

文件：

- 修改 `src/shared/config/app.ts`
- 修改 `src/app/providers/router/config/routeConfig.tsx`
- 修改 `src/widgets/app-shell/**`
- 修改相关测试与翻译

步骤：

1. 先写失败测试，断言根路由显示今天页、导航只有三个入口。
2. 新增 `/progress`，保留 `/today`、`/history` 兼容跳转。
3. 把底部导航改为“今天 / 进展 / 习惯”。
4. 运行应用壳与路由相关测试。

## 任务 2：补齐记录类型与系统预设

文件：

- 修改 `src/entities/card-template/model/types.ts`
- 修改 `src/entities/card-template/model/systemDefinitions.ts`
- 修改 `src/entities/card-template/model/seedSystemDefinitions.ts`
- 修改模板和数据库相关测试

步骤：

1. 写失败测试，覆盖五种预设、启用分类和幂等补齐。
2. 增加记录类型、图标、颜色、每日参考值和步长元数据。
3. 保持 `running` 模板 ID、版本、单位不变。
4. 运行实体与数据库测试。

## 任务 3：实现单项即时保存

文件：

- 修改 `src/features/save-today-outcome/model/saveTodayOutcome.ts`
- 新增 `src/features/save-daily-habit/**`
- 新增/修改相关事务测试

步骤：

1. 写失败测试：首次保存、覆盖当天值、目标重算、撤销、幂等提交。
2. 从旧批量保存中提取共享事务逻辑。
3. 新增按 `userCardId + localDate + quantityBaseValue` 保存的应用入口。
4. 保存后完成审计批次，避免产生待播放提示。
5. 运行保存、纠正、目标进度测试。

## 任务 4：实现今天页

文件：

- 新增 `src/features/load-daily-habits/**`
- 重写 `src/pages/today/**`
- 新增 `src/widgets/week-strip/**`
- 新增 `src/widgets/daily-habit-card/**`
- 修改翻译与测试

步骤：

1. 写模型测试，覆盖自动加载、当天值、目标与记录类型。
2. 写页面测试，覆盖五类主要操作、失败恢复和空状态。
3. 实现周日期条和即时记录卡。
4. 点击过去日期跳到进展页只读查看。
5. 运行今天页相关测试。

## 任务 5：实现进展页

文件：

- 新增 `src/pages/progress/**`
- 修改 `src/widgets/outcome-calendar/**`
- 复用 `src/features/load-home-dashboard/**`
- 复用 `src/features/load-history/**`
- 修改目标摘要与翻译测试

步骤：

1. 先写月历可选日期测试。
2. 组合真实月历、日期记录和目标摘要。
3. 过去日期不显示修改动作；今天仍沿用既有纠正能力。
4. 保留现有目标详情路由。
5. 运行进展、历史和目标测试。

## 任务 6：简化习惯页与创建流程

文件：

- 修改 `src/pages/deck/**`
- 修改 `src/widgets/card-deck/**`
- 重写 `src/pages/create-running-card/**` 为通用创建页
- 修改 `src/features/create-running-card/**`
- 修改翻译与测试

步骤：

1. 先写失败测试，覆盖两列折叠、单列展开和五种预设。
2. 移除顶部六卡槽。
3. 创建流程改为“名称 + 记录方式”必填，目标可选。
4. 保持创建事务原子性。
5. 运行卡套与创建相关测试。

## 任务 7：统一视觉美化

文件：

- 修改三个页面及共享组件 CSS
- 修改设计 token（仅在确有必要时）

步骤：

1. 统一图标、字号、圆角、间距和状态色。
2. 减少解释文字，移除大图和大标题。
3. 检查触控目标、安全区、长标题和空状态。
4. 保持深色/浅色主题可读性。

## 任务 8：完整验证与交接

步骤：

1. 运行相关测试，再运行全量测试。
2. 运行 lint、类型检查和生产构建。
3. 本地启动，在 390×844 验证三个核心页面。
4. 把选定原型与实现截图放在同一对照图中进行设计 QA。
5. 在项目根目录写 `design-qa.md`，结论必须为 `passed` 或 `blocked`。
6. 更新 `.coordination/STATUS.md` 与当前交接卡。
7. 不提交、不推送、不部署，等待用户实机验收与后续授权。

