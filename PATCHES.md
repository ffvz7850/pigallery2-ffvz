# 定制改动说明（PATCHES）

基线：PiGallery2 **3.5.2**（上游 tag，源码取自官方发布包，1020 个成员，未做任何第三方修改）。
本文档描述的改动全部集中在**竖图浏览**与**界面缩放**两块，全部可增量应用到干净的上游源码上。

---

## 一、竖列原图浏览（continuousFlowView）

### 动机
原灯箱一次只显示一张，左右切换；竖图（手机截图、长图）需要频繁缩放/翻页。目标：点开即进入竖向连续列表，按原图浏览，滚动到底为止。

### 组成
1. **新组件** `src/frontend/app/ui/gallery/lightbox/flow/vertical-flow.lightbox.gallery.component.{ts,html,css}`
   - 虚拟滚动：只渲染视口内 ±1 张，36 张目录实测 DOM 里仅 4 个 `.vf-item`
   - 尺寸预算：按 `metadata.size` 的宽高比预留高度，图片 `load` 后用 `naturalWidth/Height` 校正，校正时做**锚点补偿**（保持当前顶部那张不动）
   - 原图直载：`GridMedia.getOriginalMediaPath()`，不请求带尺寸后缀的缩略图
   - 预载：向后 3 张、向前 1 张，并发 2，`fetchPriority=low`
   - 视频：海报 + 点击播放
   - 顶栏：计数居中、关闭键右上角，同一透明度/投影、无底色；点击画面切换两者显隐
2. **灯箱接入**（`lightbox.gallery.component.ts`）：每个入口方法最前面加 `flowEnabled` 分支并 `return`，原逻辑一行未删
   - `ngOnInit` 路由变化 → 直接按完整列表打开（不依赖网格已渲染节点）
   - `showLigthbox` / `onNavigateTo` / `hideLightbox` / `nextImage` / `prevImage` / `runSlideShow` / `onResize`
   - 数据源：`GalleryComponent.directoryContent.mediaGroups`（**不能用 `gridPhotoQL`**：网格是渐进渲染的，36 张只渲染 27 个节点）
3. **必要时的一处修正**：`.lightbox` 被 `*ngIf` 包住后，`@ViewChild('photo', {static: true})` 解析不到元素，会导致关掉开关时老灯箱打不开 → 改为 `static: false`。

### 开关
`ClientConfig.ts → ClientLightboxConfig.continuousFlowView: boolean = true`

---

## 二、界面缩放（interfaceZoom）

### 动机
在飞牛桌面等内嵌环境里无法使用浏览器缩放，而设备显示比例偏大，页面元素显得过大。

### 实现
- `ClientConfig.ts → ClientGalleryConfig.interfaceZoom: number = 100`（`unsignedInt`, `min 50`, `max 150`）
- `app.component.ts → ngOnInit` 调用 `applyInterfaceZoom()`：
  ```ts
  document.documentElement.style.zoom = pct / 100;   // 100 时移除属性
  ```
- 选 `zoom` 而不是 `transform: scale` 的原因：`zoom` 会改变布局视口，组件内 `clientWidth` / `getBoundingClientRect` 自动一致；`transform` 会破坏 `position: fixed` 覆盖层与滚动。

### 实测（1280×900，Edge）

| interfaceZoom | html zoom | 导航栏 | 关闭键 | 一屏可见缩略图 | 全屏覆盖层 |
| --- | --- | --- | --- | --- | --- |
| 100 | 1 | 80px | 56px | 27 | 1280×900 |
| 80 | 0.8 | 63.9px | 45px | 30 | 1280×900 |
| 120 | 1.2 | 96px | 67px | 25 | 1280×900 |

---

## 三、竖图流的验收数据（1280×900，36 张目录）

| 项 | 结果 |
| --- | --- |
| 点第 2 张 | HUD `2 / 36`，就是点中那张 |
| DOM 节点 | `.vf-item` 4 个（虚拟滚动生效） |
| 图片 URL | `/pgapi/gallery/content/…/2.jpg`，带尺寸后缀 0 条 |
| 滚动 1500~2200px | HUD 递增，节点数按需增减 |
| Esc / 关闭键 | 回网格，`?p=` 清除，网格滚回最后看到的那张 |
| 关闭开关后 | 经典灯箱打开，`<img>` 仍是原图（无后缀） |
| 中/英/其余 14 语言 | 16 个语言包均含组件代码，无语言相关缺失 |
| 手机 390×844 | 满宽、上下无缝、HUD 与关闭键位置正常 |

---

## 四、构建注意

1. `npm ci` 之后前端产物是 `dist/<lang>/main.<hash>.js`，需要 `npx gulp localize-bundles` 改名并改写 `index.html`（上游自带该任务）。
2. 设置项的标题/默认值来自**后端**编译后的 `ClientConfig.js`，只替换前端 `dist` 不会出现新设置项。
3. 上游 `npm run build` 在部分 Windows 环境会因 gulp 子进程报错；用 `ng build` + `gulp localize-bundles` 两步等价。
4. 若在 Docker 里构建，注意 `dist` 与 `ClientConfig.js` 两处都要替换。

---

## 五、回滚

改动都是"加分支 + 加字段"，删除 `flow/` 目录并还原 7 个文件即可回到纯上游行为；或直接把镜像 tag 切回 `:1.0.4`。
