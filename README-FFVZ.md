# PiGallery2 FFVZ 定制版（1.1.5）

基于 **PiGallery2 3.5.2**（MIT，上游 https://github.com/bpatrik/pigallery2 ）的个人定制分支，只做两件事：

1. **竖列原图浏览**：点开图片进入全屏竖向列表，按原图连续滚动（虚拟滚动），可用设置开关退回原灯箱。
2. **界面缩放**：软件内整页缩放（等价浏览器 Ctrl +/-），用于飞牛桌面等无法调浏览器缩放的环境。

运行镜像：`ffvz/pigallery2:1.1.5`（基于作者自建的 `ghcr.io/ffvz7850/pigallery2:1.0.4`，前端 dist 用本仓库源码构建）。

---

## 与上游的差异

| 文件 | 改动 | 说明 |
| --- | --- | --- |
| `src/frontend/app/ui/gallery/lightbox/flow/*`（新增 3 个文件） | 新组件 | 竖向列表：虚拟滚动、原图直载、预载、锚点补偿、点击隐藏 HUD |
| `src/frontend/app/ui/gallery/lightbox/lightbox.gallery.component.ts` | +174 / −2 | 开关分支：打开/关闭/导航/缩放时走 flow，原逻辑一行未删 |
| `src/frontend/app/ui/gallery/lightbox/lightbox.gallery.component.html` | +5 / −2 | `*ngIf` 分流 + 传入 `mediaGroups` |
| `src/frontend/app/ui/gallery/lightbox/media/media.lightbox.gallery.component.ts` | +2 / −17 | `loadPhoto` 改为**无条件原图**（沿用作者 1.0.4 的既定行为） |
| `src/frontend/app/ui/gallery/grid/grid.gallery.component.ts` | +18 | `scrollToMedia()`：关闭竖图流后把网格滚回原位 |
| `src/frontend/app/ui/gallery/gallery.component.ts` / `.html` | +5 / +3 | 把 `mediaGroups` 传给灯箱、接收关闭回调 |
| `src/common/config/public/ClientConfig.ts` | +17 | 新增 `Gallery.Lightbox.continuousFlowView`、`Gallery.interfaceZoom` |
| `src/frontend/app/app.component.ts` | +12 | `applyInterfaceZoom()`：把 `interfaceZoom` 落到 `document.documentElement.style.zoom` |
| `tsconfig.common.json`（新增） | 13 行 | 仅用于把 `ClientConfig.ts` 单独编译成后端可用的 JS |

逐行 diff 见 `docs-ffvz/diff/patches.diff`（分文件版本在同目录）。

## 设置项

| 位置 | 名称 | 默认 | 说明 |
| --- | --- | --- | --- |
| 设置 → 高级 → 画廊 → 灯箱 | Continuous vertical view 竖列原图浏览 | 开 | 关闭后回到经典左右切换灯箱（仍是打开即原图） |
| 设置 → 高级 → 画廊（第一项） | Interface zoom 界面缩放（50~150） | 100 | 整页缩放，保存后刷新生效 |

> 「画廊」整组在上游被标为 advanced，需先把右上角模式切到**高级**。

## 构建

```bash
npm ci
# ① 先生成 gulpfile.js 与后端 JS（clean 克隆必需：仓库不含编译产物）
npx tsc
# ② 前端（16 种语言）
npx ng build --configuration production --no-progress
# ③ 把 main.<hash>.js 改名成 <lang>.main.<hash>.js 并改写 index.html
npx gulp localize-bundles
# ④ 单独产出后端配置类（设置项名称/默认值来自它）
npx tsc -p tsconfig.common.json  # 产物 release/src/common/config/public/ClientConfig.js
```

> 第 ① 步不能省：`gulpfile.js` 由 `tsc` 从 `gulpfile.ts` 生成，且按上游 `.gitignore` 不提交；没有它 `npx gulp` 会直接报找不到配置。

> 上游的 `npm run build`（`tsc && gulp build-prod`）在 Windows 上可能因 gulp 子进程报错退出；上面两步等价。

## 打镜像

```dockerfile
FROM ghcr.io/ffvz7850/pigallery2:1.0.4     # 作者原镜像（含 1.0.4 的其它定制）
COPY dist /app/dist
COPY release/src/common/config/public/ClientConfig.js /app/src/common/config/public/ClientConfig.js
```

`ClientConfig.js` 必须覆盖：设置项的名称、范围、默认值都在里面，只换 `dist/` 不会出现新开关。

## 已知限制

- 竖图流加载**原图**（单张几 MB~几十 MB），移动网络下费流量。
- 竖图流内没有信息面板、幻灯片、缩放控件；需要时关掉开关用原灯箱。
- `loadFullImageOnZoom`、`loadFullImageIfPreviewTooSmall` 因"打开即原图"而失效（继承 1.0.4 行为）。
- 缩放在保存后需刷新页面生效。

## 许可

上游 MIT，见 `LICENSE`（Copyright (c) 2016 bpatrik）。本分支同样以 MIT 发布；新增文件版权归本分支作者。二次分发请保留 `LICENSE` 与上方上游链接。
