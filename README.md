# 重复成果显化

“重复成果显化”把每天真实完成的重复行动，转换成可累计、可回顾的可见成果。

当前版本为 `3.0.0-rc.20` 公开候选：记账统计页新增可展开的“全部记录”，可跨月份查看所有账目，并按事项、分类、账户、备注、日期、时间、收支类型或金额查找；点击结果可进入对应账目。记账数据结构、普通/加密备份、原子恢复及 PWA 安全更新流程保持不变。

- 候选站：<https://repeat-outcome.pages.dev>
- 项目源码：<https://github.com/pkivan1985-crypto/xiguan>

候选站仍在 Android/iOS 真机、真实文件恢复和版本更新验收阶段，不应视为正式 `v3.0.0`。

## 产品边界

- 手机优先响应式网页 + PWA。
- 第一阶段本地单用户、无账号、无后端、无云同步。
- 业务数据只保存在用户自己的浏览器中。
- 不以连续签到、扣分或失败惩罚驱动用户。

## 本地开发

Windows 项目工具链固定为 Node.js `24.17.0` 和 npm `11.18.0`：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap-toolchain.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm ci
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm run dev
```

完整验证：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm run verify
```

## 开源来源与许可证

本项目以 [iNikAnn/DoHabit](https://github.com/iNikAnn/DoHabit) 为主代码底座，保留其 Git 历史、作者记录和许可证。

项目整体采用 [AGPL-3.0](./LICENSE)。进入候选发布前会公开与运行版本对应的项目源代码；本地阶段不虚构仓库地址，也不会把项目问题误报到 DoHabit 上游。

第三方 npm 依赖见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)，发布资产见 [release-assets.json](./release-assets.json)，隐私与安全报告边界见 [SECURITY.md](./SECURITY.md)。
