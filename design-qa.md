# R4 三屏忠实重做——设计 QA

> 日期：2026-07-26
> 验收视口：CSS 390 × 844，DPR 1
> 参考图：853 × 1844，等比归一化为 390 × 843；多出的 1px 归入底部安全区
> 数据原则：实现图使用 IndexedDB 中经真实 UI 创建和保存的数据，不在产品代码中写入截图假数据

## 对照输入

| 页面 | 归一化参考图 | 最终实现图 | 最终并排对照 |
|---|---|---|---|
| 今天 | `.artifacts/r4-three-screen-faithful-redesign/reference-today-390x843.png` | `.artifacts/r4-three-screen-faithful-redesign/implementation-today-final-390x844.png` | `.artifacts/r4-three-screen-faithful-redesign/comparison-today-final-side-by-side.png` |
| 进展 | `.artifacts/r4-three-screen-faithful-redesign/reference-progress-390x843.png` | `.artifacts/r4-three-screen-faithful-redesign/implementation-progress-data-compact-final-390x844.png` | `.artifacts/r4-three-screen-faithful-redesign/comparison-progress-final-side-by-side.png` |
| 习惯 | `.artifacts/r4-three-screen-faithful-redesign/reference-habits-390x843.png` | `.artifacts/r4-three-screen-faithful-redesign/implementation-habits-final2-390x844.png` | `.artifacts/r4-three-screen-faithful-redesign/comparison-habits-final-side-by-side.png` |

完整页面已在同一 390px CSS 视口逐页并排检查。三个页面的关键内容都位于首屏，没有需要额外裁切才能判断的 P0/P1/P2 区域，因此不另造局部特写。

## 最终视觉复核

### 今天

- 页头、七日条、40 × 63px 选中日、单行完成概览、统一习惯主面板、双入口和三项底部导航均与参考结构一致。
- 五种真实追踪类型保留不同控件：完成、数值减加、次数加号、时长播放和避免确认。
- 去除了底部导航的重色块选中背景，保持蓝色图标和文字状态。
- 实现图日期、数值和习惯顺序来自当前真实测试数据，与参考图示例数据不同；这不是结构或视觉缺陷。

### 进展

- “月历 / 目标”分段、月历与日期成果合并面板、38 × 39px 选中日、日期触控区域、总规划和三项导航均对齐批准方向。
- 五条真实当日记录在固定记录区内滚动，不挤压月历骨架。
- 总规划密度已收紧；长期目标和阶段目标仍保留两条真实独立进度，不用虚假合并值。
- URL 日期是页面状态唯一来源；浏览器前进、后退会同步选中日期和成果内容。

### 习惯

- 页头使用“习惯”，四个约 29px 可见筛选胶囊仍保留 44px 触控目标。
- 首张真实目标卡默认展开并独占整行，其余卡片一行两张；一次只展开一张。
- 展开卡保留真实长期目标、阶段目标、计划、详情和收起操作；未放置不可用的假编辑/假归档按钮。
- 两行折叠卡和真实归档摘要均能在 390 × 844 首屏中看到。

## 功能与回归证据

- 今天页完成了五个习惯的真实记录；跑步 3.00 km、喝水 5 杯、阅读 5 分钟、早睡完成、不刷短视频完成。
- 多习惯快速保存已串行化；临时单卡保存不会覆盖既有六槽草稿；播放完成回调失败不会把已提交记录误报为保存失败。
- 刷新后记录和值保留。
- 进展页日期选择、月份切换、目标分段、日期详情、浏览器前进/后退均通过。
- 习惯页分类筛选、展开、收起、新建入口和目标详情入口均通过。
- `/progress/` 与 `/deck/` 尾斜杠直达只渲染一个正确页头。
- 最新生产构建在全新来源完成 Service Worker 安装；断网后 `/deck` 与 `/progress` 均可重新打开，恢复联网正常。
- 浏览器运行日志为空；未发现 console/runtime error。
- `manifest.webmanifest` 与 `index.html` 的主题色、背景色均为 `#071417`。
- 自动验证：79 个测试文件、317 个测试通过；CSS Lint、TypeScript、Vite 和 PWA 构建通过。Vite 大 chunk 提示为既有非阻塞警告。
- 独立开发审查发现的无效日期 URL 未规范化和 `/settings/` 自链接两个 P2 已修复并复测关闭。

## 剩余设备说明

- 本轮在浏览器的 390 × 844 移动视口完成本地设计和 PWA 离线验收。
- 当前没有用这份尚未发布的本地 R4 构建重新跑 Android 与 iPhone 真机；真机验收应在用户后续明确授权发布候选版本后进行，不在本地通过结论中伪造。

## 最终结论

- P0：0
- P1：0
- P2：0
- 本地设计与功能 QA：通过
- 推送、部署、版本号或 RC：未执行

final result: passed
