# ZYW♥CSX的恋爱手记 · PWA 1.1.0

可添加到 iPhone 主屏幕的离线恋爱手记。原生 Android 项目的网页版，数据保存在当前设备的 IndexedDB，不上传到 GitHub，也不包含广告或分析脚本。

## 1.1.0 更新

- 安装图标固定为用户选定的“心里的虎羊”。iPhone PWA 不提供运行中切换桌面图标的入口。
- 使用新的 180 / 192 / 512px 图标文件，更新 apple-touch-icon、manifest 与离线缓存版本，保持 manifest id、scope、start_url 和本地数据库名称不变。
- 设置页显示当前固定图标，并说明功能更新与桌面图标刷新的区别。
- 功能更新：联网打开已安装的手记，在设置中检查程序更新并确认；通常不需要重新添加主屏幕。桌面旧图标不保证自动变化，如需更换，先导出备份，再从 Safari 添加新入口并确认记录恢复后再处理旧入口。

## 在 iPhone 上使用

1. 用 Safari 打开网站，首次打开保持联网。
2. 分享 → 添加到主屏幕；如果显示“作为网页 App 打开”，请开启。
3. 从主屏幕爱心图标打开，再开始正式记录。

Safari 标签页与主屏幕版的存储可能独立。请先安装再记录；已有数据可在设置导出备份再恢复。

## 功能

- 纪念日、生日、倒数日、大事记，公历日期与每年重复；选择当天为第 0 天或第 1 天。
- 里程碑总开关，内置 100 / 200 / 300 天和 1 / 2 / 3 年；单项开关、自定义里程、删除与固定默认项。
- 虎、羊各 15 种心情插画与双人抱心图；唠唠本记录、照片、搜索及编辑。
- 3 种排版、6 种底色、虎羊表情和照片卡片；照片拖动裁剪、双指及滑杆缩放、虚化和遮罩。
- 纪念卡可同步所选纪念日卡片，也可保留独立方案；支持横幅 / 方形、导出图片或系统分享。
- 跟随系统、浅色、深色外观。
- JSON 完整备份 / 恢复；可导入安卓版导出的 ZIP 备份及照片。PWA JSON 尚不能直接导回安卓版。
- Service Worker 缓存程序、插画与本地依赖。首次联网准备完成后支持离线使用。

## 提醒与 iPhone 限制

GitHub Pages 是静态托管。此版本没有推送服务器，不会申请一个无法兑现定时提醒的通知权限。

日期及里程碑提醒可导出 `.ics` 日历文件，包含本地时间上午 9 点和提前 3 天的提醒；同日项目合并。每年重复的日期导出未来 10 年；2 月 29 日在平年按 2 月 28 日计算。

将 `.ics` 加入系统日历，开启日历通知，由系统执行提醒。不同 iOS 版本的本地 `.ics` 打开体验可能不同；若只能预览，可通过日历账户导入，或在电脑日历导入后同步到 iPhone。修改或删除 App 中的日期不会自动修改已导入的日历，需删除旧日历项目后重导。

PWA 无法创建原生 iPhone 桌面小组件。纪念卡可以保存 / 分享为图片；图中天数为导出时的快照。

## 数据与隐私

本站程序和插画公开，填写的日子、照片、日记在各自设备本地保存。两部手机没有自动云同步。GitHub 仍可能按其服务政策记录访问站点的网络信息。

系统清理网站数据、移除网页 App、更换手机或存储空间紧张可能造成数据丢失，请定期导出完整备份。备份包含个人照片和文字，请妥善保管。

导入上限为 80 MB 压缩包、110 MB 解压总量、25 MB 单项；图片选入上限 35 MB，普通日记照片缩小至最长 1600 像素。

## 本地运行与部署

无需 npm 构建，无线上 CDN 依赖。

```sh
python -m http.server 8767
node --test tests/core.test.js
```

打开 `http://localhost:8767`。Service Worker 需要 HTTPS，或本机 localhost。

GitHub Pages 发布 main 分支根目录。所有资源、manifest 与 Service Worker 都使用相对路径，兼容 `https://用户名.github.io/仓库名/`。程序更改后需修改 `sw.js` 中的缓存版本，再提交。新版会提示更新，不主动清空本机 IndexedDB。

## 第三方与参考

- `vendor/fflate.js`：fflate 0.8.2，MIT，许可证见 `vendor/fflate-LICENSE`，用于读取 Android ZIP 备份。
- 插画沿用 Android 项目已有生成素材。
- [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [iPhone 主屏幕网页 App](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios)
- [Apple Web Push 限制](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
