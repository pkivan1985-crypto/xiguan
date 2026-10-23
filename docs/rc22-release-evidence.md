# RC.22 发布结果（2026-10-10）

- 用户确认先发布当前RC.22，使用过程再反馈更新；保留实机与系统返回未保存保护的已知边界。
- 实现提交：`482f97a`；发布准备：`007e139359dad48aee058d3235c63745cd8b79a6`。
- PR：https://github.com/pkivan1985-crypto/xiguan/pull/22 ，已合并。
- main合并提交：`3e6db74fd1dc00961598bccf0b7fb5b0919fb1d5`。
- PR CI运行 `38047793256` 成功；main CI运行 `38047883108` 成功；Cloudflare Pages check成功。
- GitHub：https://github.com/pkivan1985-crypto/xiguan/releases/tag/v3.0.0-rc.22 ，isPrerelease=true、isDraft=false，目标为上述main合并提交。
- 公网：https://repeat-outcome.pages.dev ，首页引用 `/assets/index-Bd4i2DTz.js`；实际JS包含 `3.0.0-rc.22`，不包含 `3.0.0-rc.21`。
- `/money`、`/money/records`、`/money/accounts`、`/progress`、`/deck`、`/manifest.webmanifest`、`/sw.js` 均HTTP200。这只是部署/路由回退检查，不代表已逐条操作业务。
- 本地104文件/525测试通过，完整verify、public发布门禁通过；PR与main CI再次运行完整检查成功。
- 线上浏览器控制两次超时；未新增线上截图或实际手机操作结论。部署成功由GitHub/Cloudflare状态及HTTP真实资源版本验证。
- 本轮未清空本地或生产业务数据，未提交/删除原有 `.artifacts/`、`00-项目统筹/`、`design-qa-artifacts/`。

用户更新时先备份，保存当前输入后使用应用更新提示；不要清除网站数据。系统/浏览器SPA返回手势目前不能保护未保存表单，使用页面内返回按钮。软键盘、触摸、安全区、离线冷启动与旧PWA升级继续由真实设备反馈补验。

本文为发布后本地检查点，不改变已发布标签内容。
