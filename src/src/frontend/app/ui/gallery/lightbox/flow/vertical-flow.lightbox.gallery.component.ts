import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {GridMedia} from '../../grid/GridMedia';
import {MediaDTO} from '../../../../../../common/entities/MediaDTO';
import {Config} from '../../../../../../common/config/public/Config';
import {Utils} from '../../../../../../common/Utils';
import {
  alignPreviewEdge,
  FAST_RATE,
  FAST_SETTLE_MS,
  FlowTuning,
  MOUNT_AHEAD,
  MOUNT_BEHIND,
  PRE_GEN_COUNT,
  PREVIEW_EDGE,
  readTuning,
  RESIZE_SETTLE_MS,
} from './flow-tuning';

export interface FlowItem {
  gridMedia: GridMedia;
  ratio: number;
  ratioFixed: boolean;
  height: number;
  loaded: boolean;
  failed: boolean;
  playing: boolean;
  /** 720 档 URL（底图用，已落盘，几十毫秒） */
  lowPath?: string;
  /** 高清档 URL（2160 预览档，或原图） */
  hdPath?: string;
  /**
   * 已经绑到 `.vf-full` 那个 <img> 上的 URL —— 「粘性」字段。
   *
   * 一旦写进这里就再也不回退、不置空：滑动中改 src 会让 <img> 重新解码，
   * 表现就是「同一张图滑一下又闪一下」；而把 src 设为空/摘掉元素，
   * 更是整屏从有图变底色再变回来。两个都是 1.3.18~1.3.20 的闪烁来源。
   * 只有两种事会改它：升级成原图（双指放大）、或者调参导致的整体重置。
   */
  fullSrc?: string;
  /** 2160 预览档生成失败过：以后别再要了，退回 720 */
  previewFailed?: boolean;
  posterPath?: string;
  /** 视频封面是否已可绘制 */
  posterDecoded?: boolean;
  /** 双指放大过：这张改走原图（真原图，不再是 2160 预览档） */
  origMode?: boolean;
}

export interface FlowWindowItem {
  index: number;
  item: FlowItem;
  top: number;
  height: number;
}

const DEFAULT_RATIO = 3 / 4;
/**
 * 预热并发路数：1 路。
 *
 * 服务端给「真正要看的那张」留了一个名额（见 MemoryPreviewMWs.acquire 的 pregen 判断），
 * 所以这里排 1 路既不会挡住当前张，也不会把 4 核一起点着 —— 单张 2.5 s，
 * 看一张图的两三秒刚好够它把下一张做完。
 */
const PREGEN_CONCURRENCY = 1;

/**
 * 无底图模式下，预热推迟多久再判断（ms）。
 *
 * 为什么要推：服务端 MAX_CONCURRENT 只有 2。关掉底图时挂载窗口里那几张正在申请这两个名额，
 * 这时插一条预热进来会实打实分掉一半并行度 —— 实测首屏从 4.6 s 拖到 5.0 s。
 * 推到「当前张已经上屏」之后再跑，首屏那 400 ms 就还回去了；用户看第一张的时间足够预热跑完。
 * 每 PREGEN_DELAY_MS 复查一次，最多等 PREGEN_DELAY_MAX 次（约 5.4 s），
 * 之后无论如何都跑 —— 免得某张一直失败（预览档生成报错）把预热永久卡住。
 */
const PREGEN_DELAY_MS = 900;
const PREGEN_DELAY_MAX = 6;

/**
 * 竖向连续浏览：一屏一张，图片与视频混排。
 *
 * 三层结构：
 *   - `.vf-bg`   磁盘上现成的 720 档，挂载即出图，永远垫在最下面（设置页可关）
 *   - `.vf-full` 短边 2160 的内存预览档（服务端现生成、不落盘），叠在 720 上换清晰度
 *   - 视频用封面 + 播放键，点开才真正拉视频流
 *
 * 刻意「不做」的事：没有预载队列、没有解码保活、没有 abortStale。
 * 每张图就是浏览器里一个普通 <img>，什么时候下、下多少并发、解码缓存留谁，
 * 全交给浏览器自己调度 —— 实测比自建预载更快（自建的那套在和浏览器抢带宽、
 * 抢解码缓存：一张 8000px 的图解码位图几百 MB，足以把 720p 全赶出去）。
 *
 * 唯一主动插手的只有两处，都是因为「服务端要花 2.4 s 现生成」：
 *   - 预热队列（startPreGen）：提前把锚点后 2 张生成好
 *   - 甩动节流（fastScrolling）：甩起来就停手，别烧 CPU 去生成滑过去的图
 */
@Component({
  selector: 'app-gallery-lightbox-flow',
  templateUrl: './vertical-flow.lightbox.gallery.component.html',
  styleUrls: ['./vertical-flow.lightbox.gallery.component.css'],
  imports: [NgFor, NgIf],
})
export class VerticalFlowLightboxComponent implements OnDestroy {
  @ViewChild('scroll', {static: false}) scrollRef: ElementRef;
  @Output() closed = new EventEmitter<GridMedia>();

  public opened = false;

  /** 父组件关灯箱前要问一句「竖图流还开着吗」（`this.flow?.isOpen()`） */
  public isOpen(): boolean {
    return this.opened;
  }
  public items: FlowItem[] = [];
  public windowItems: FlowWindowItem[] = [];
  public totalHeight = 0;
  public current = 0;
  /** 顶栏（计数 + 关闭键）默认隐藏，点一下画面才浮出来 */
  public hudVisible = false;
  /** 抵消设置里的「界面缩放」，竖图浏览始终 100% 铺满 */
  public inverseZoom = 1;

  /** 生效参数：内置默认 → 设置页（只有底色和底图开关两项） */
  public tuning: FlowTuning = readTuning();

  private pre: number[] = [0];
  private width = 0;
  private viewHeight = 0;
  private winFrom = -1;
  private winTo = -1;
  private pinned = false;
  private pinIndex = 0;
  private pinY = 0;
  private rafId: number = null;
  private frameId: number = null;
  private resizeTimer: number = null;
  /**
   * 快速甩动中：不给非当前张绑 2160、推迟比例重排、掐掉预热队列。
   * 只驱动行为，不驱动样式（曾经的短淡入 class 已随 720 底图方案删掉）。
   */
  private fastScrolling = false;
  private fastTimer: number = null;
  private fastUntil = 0;
  private lastScrollTime = 0;
  private lastScrollTop = 0;
  /** 同一帧内多张图 load 完，比例纠正合并成一次 rebuild */
  private pendingRatios = new Map<FlowItem, number>();
  private ratioRafId: number = null;
  /** 甩动中已解码、等停手才放行的项（延迟清晰化） */
  private pendingReveal = new Set<FlowItem>();
  /** 预热代次：每次重开 / 改参数都 +1，旧队列的回调看到代次变了就停 */
  private preGenToken = 0;
  /** 预热请求的中断句柄：换锚点 / 开始甩动时把还在排队的预热掐掉，把名额让给当前张 */
  private preGenAbort: AbortController = null;
  /** 页面被双指放大（原生缩放）时升高清档 */
  private vvHandler: () => void = null;
  /** 兜底：有些 webview 里没有 visualViewport，用两指距离变化判断 */
  private pinchDist = 0;
  /** 预热队列是从哪一张开始的；锚点跑远了要重排 */
  private lastPreGenFrom = -2;
  /** 预热延迟计时器（无底图模式下等首屏先拿名额，见 schedulePreGen） */
  private preGenTimer: number | null = null;

  constructor(private cd: ChangeDetectorRef, private host: ElementRef) {
  }

  get CurrentIndex(): number {
    return this.current;
  }

  ngOnDestroy(): void {
    this.cancelFrames();
    this.reset();
  }

  // ---------------------------------------------------------------- 对外 API

  public open(list: GridMedia[], startIndex: number): boolean {
    if (!list || list.length === 0) {
      return false;
    }
    this.reset();
    this.items = list.map((gm: GridMedia): FlowItem => {
      const ratio = VerticalFlowLightboxComponent.ratioOf(gm.media);
      return {
        gridMedia: gm,
        ratio: ratio > 0 ? ratio : DEFAULT_RATIO,
        ratioFixed: ratio > 0,
        height: 1,
        loaded: false,
        failed: false,
        playing: false,
      };
    });
    this.opened = true;
    this.tuning = readTuning();
    this.applyVoidColor();
    this.startZoomWatch();
    this.inverseZoom = VerticalFlowLightboxComponent.inverseZoomFromConfig();
    // 先让模板渲染出滚动容器，才能读到宽高
    this.cd.detectChanges();
    const el = this.scroller();
    if (!el) {
      this.reset();
      return false;
    }
    this.width = el.clientWidth || window.innerWidth;
    this.viewHeight = el.clientHeight || window.innerHeight;
    this.rebuild();
    const start = Math.max(0, Math.min(startIndex, this.items.length - 1));
    this.positionAt(start, true);
    this.updateWindow(true);
    // 布局是异步的，下一帧再定位一次，避免被浏览器 clamp 到 0
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.positionAt(start, true);
      this.updateWindow(true);
    });
    this.schedulePreGen(start);
    return true;
  }

  /** 关闭并返回最后看到的那张（可重复调用） */
  public close(): GridMedia {
    if (!this.opened) {
      return null;
    }
    const el = this.scroller();
    const idx = el
      ? this.indexAt(el.scrollTop + (this.viewHeight || el.clientHeight) / 2)
      : this.current;
    const media = this.items[idx]?.gridMedia ?? this.items[this.current]?.gridMedia ?? null;
    this.reset();
    // 关灯箱就把服务端内存里的 2160 预览档放掉（不落盘，清了就没了）
    VerticalFlowLightboxComponent.clearPreviewCache();
    return media;
  }

  public scrollToIndex(index: number): void {
    if (!this.opened || this.items.length === 0) {
      return;
    }
    const i = Math.max(0, Math.min(index, this.items.length - 1));
    this.positionAt(i, true);
    this.updateWindow(true);
  }

  public requestClose(): void {
    if (!this.opened) {
      return;
    }
    this.closed.emit(this.close());
  }

  // ------------------------------------------------------------- 滚动与窗口

  public onScroll(): void {
    const el = this.scroller();
    if (!el) {
      return;
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dy = Math.abs(el.scrollTop - this.lastScrollTop);
    if (this.lastScrollTime > 0 && now > this.lastScrollTime &&
      dy / (now - this.lastScrollTime) > FAST_RATE) {
      this.setFastScrolling(true);
    }
    this.lastScrollTime = now;
    this.lastScrollTop = el.scrollTop;
    if (this.pinned && Math.abs(el.scrollTop - this.pinY) > 2) {
      this.pinned = false;
    }
    if (this.rafId !== null) {
      return;
    }
    this.rafId = requestAnimationFrame((): void => {
      this.rafId = null;
      this.updateWindow(false);
    });
  }

  @HostListener('window:resize')
  public onResize(): void {
    if (!this.opened) {
      return;
    }
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = window.setTimeout((): void => {
      this.resizeTimer = null;
      this.applyResize();
    }, RESIZE_SETTLE_MS);
  }

  private applyResize(): void {
    const el = this.scroller();
    if (!this.opened || !el) {
      return;
    }
    const anchor = this.indexAt(el.scrollTop);
    const oldH = this.items[anchor] ? this.items[anchor].height : 0;
    const off = el.scrollTop - this.pre[anchor];
    this.width = el.clientWidth || window.innerWidth;
    this.viewHeight = el.clientHeight || window.innerHeight;
    // 只有视频封面 URL 带窗口尺寸，窗口变了要重算；照片的原图 / 720 档与视口无关
    this.items.forEach((it: FlowItem): void => {
      if (!it.gridMedia.isVideo()) {
        return;
      }
      it.posterPath = undefined;
      it.posterDecoded = false;
    });
    this.rebuild();
    // 按比例还原偏移：否则改窗口时画面会在同一张里「跳」一截
    const newH = this.items[anchor] ? this.items[anchor].height : oldH;
    const keep = oldH > 0 ? Math.round((off * newH) / oldH) : off;
    el.scrollTop = this.pre[anchor] + Math.min(keep, newH);
    if (this.pinned) {
      this.positionAt(this.pinIndex, true);
    }
    this.winFrom = -1;
    this.winTo = -1;
    this.updateWindow(true);
  }

  @HostListener('window:keydown', ['$event'])
  public onKeyDown(e: KeyboardEvent): void {
    if (!this.opened) {
      return;
    }
    const el = this.scroller();
    if (!el) {
      return;
    }
    if (e.key === 'Escape') {
      this.requestClose();
    } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      el.scrollTop += this.viewHeight * (e.key === 'ArrowDown' ? 0.25 : 0.9);
      this.onScroll();
      e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      el.scrollTop -= this.viewHeight * (e.key === 'ArrowUp' ? 0.25 : 0.9);
      this.onScroll();
      e.preventDefault();
    }
  }

  // ------------------------------------------------------------------ 图片

  /**
   * 大图层（`.vf-full`）的 URL。
   *
   * 两条硬规则，都是为了「滑过去不闪」：
   *   1. **粘住**：`fullSrc` 一旦写进去就直接返回，绝不因为「不再当前」「开始甩动」
   *      而改回 720 或返回空。改 src 会让 <img> 重新解码（2160 换回 720 就是降质闪一下），
   *      返回空会让 *ngIf 把元素整个摘掉（整屏从有图变底色，停手再淡回来 —— 更闪）。
   *      这一条同时解决了「关了底图滑动闪烁」和「2160 滑动重新加载」。
   *   2. **首次绑定要克制**：冷绑定才去判断现在该不该下这一张。
   *
   * 关于首次绑定：短边超过阈值时走「临时预览档」——服务端在内存里现生成、不落盘。
   * 一张 8736px 的图解码要 2.4 s、位图几百 MB；2160 档约 0.6MB、解码几十毫秒。
   */
  public fullSrcOf(w: FlowWindowItem): string {
    const it = w.item;
    if (!it.gridMedia.isPhoto()) {
      return null;
    }
    // ① 粘住：绑过的永远返回同一个 URL，滑动 / 甩动都不动它
    if (it.fullSrc) {
      return it.fullSrc;
    }
    const settled = !this.fastScrolling;
    const isCurrent = w.index === this.current;
    if (this.tuning.lowEnabled) {
      // 有 720 底图垫着：非当前张只留底图那一份，别再多挂一张同样的 720
      // （之前就是这个重复：`.vf-bg` 和 `.vf-full` 指向同一个 URL，白解一张、白合成一层）。
      // 等它成为当前张、且手指停了，再升高清档 —— 底下垫着 720，升级过程不露底。
      return settled && isCurrent ? (it.fullSrc = this.hdUrlOf(it)) : null;
    }
    // 没底图：窗口里每张都得自己上屏，否则滑过去就是一片底色（1.3.18 的错误）。
    // 甩动中新进窗口的先等停手 —— 一张冷生成 2.4 s，飞过去时请求必然作废，白烧 CPU。
    // 但已经绑过的仍然保留（上面 ① 早退），所以「滑出去又滑回来」不会重下。
    return settled || isCurrent ? (it.fullSrc = this.hdUrlOf(it)) : null;
  }

  /**
   * 要不要挂 720 底图。
   *
   * 两种情况不挂：
   *   1. 设置里关掉了 720 底图（一张都不请求）
   *   2. 视频的封面本来就是同一个 720（只有一档缩略图时必然相同），再挂一份就是重复下载
   *
   * 注意这里**不**按「大图已上屏」把它撤掉：撤掉的瞬间大图正在淡入（opacity 从 0 起），
   * 底下那层一没了就会先露一帧底色 —— 那正是要治的「闪」。
   * 真正去掉的重复是另一个：以前非当前张的 `.vf-full` 也指向同一个 720，
   * 同一张图在 DOM 里存两份、解两遍，那份已经删了（见 fullSrcOf）。
   */
  public needBg(w: FlowWindowItem): boolean {
    const it = w.item;
    if (!this.tuning.lowEnabled) {
      return false;
    }
    if (it.gridMedia.isVideo()) {
      return this.posterOf(it) !== this.thumbOf(it);
    }
    return true;
  }

  /** 720 档：与底图同一个 URL，浏览器只请求一次 */
  private lowUrlOf(item: FlowItem): string {
    return item.lowPath ||
      (item.lowPath = item.gridMedia.getBestSizedMediaPath(720, 720));
  }

  /**
   * 高清档：短边超过阈值时走 2160 内存预览档，否则原图。
   *
   * 档位直接拼在 URL 后面，不能用 `getBestSizedMediaPath()`：它按 `thumbnailSizes`
   * 找最近档，而 2160 故意不写进 `thumbnailSizes`（那会落盘），于是必然回落成 720。
   */
  private hdUrlOf(item: FlowItem): string {
    if (item.hdPath) {
      return item.hdPath;
    }
    const gm = item.gridMedia;
    // 双指放大过：直接给真原图。2160 档在 3 倍原生缩放下就是糊的，
    // 放大这一步本来就是要「看清细节」，再省流量就没意义了。
    if (item.origMode) {
      return (item.hdPath = gm.getOriginalMediaPath());
    }
    // 2160 预览档在这台机器上生成失败过（个别图 sharp 会报错）：
    // 退回 720 —— 那张是磁盘上现成的，一定能出来，别再反复撞墙。
    if (item.previewFailed) {
      return (item.hdPath = this.lowUrlOf(item));
    }
    const edge = alignPreviewEdge(PREVIEW_EDGE);
    if (edge > 0) {
      const size = gm.media?.metadata?.size;
      const shortEdge = size ? Math.min(size.width || 0, size.height || 0) : 0;
      // 留 15% 余量：本来就在 2300px 左右的图换成 2160 档既没收益、又白掉一点画质
      if (shortEdge > edge * 1.15) {
        return (item.hdPath = gm.getOriginalMediaPath() + '/' + edge);
      }
    }
    return (item.hdPath = gm.getOriginalMediaPath());
  }

  public posterOf(item: FlowItem): string {
    return item.posterPath ||
      (item.posterPath = item.gridMedia.getBestSizedMediaPath(window.innerWidth, window.innerHeight));
  }

  public videoOf(item: FlowItem): string {
    return item.gridMedia.getBestFitVideoPath();
  }

  /**
   * 底图 URL：固定 720 档，和 `lowUrlOf` 是同一个字符串。
   *
   * 不能用 `getThumbnailPath()` —— 它拿网格渲染尺寸算档位，而竖图流里深处那些项
   * 当初没在网格渲染过（renderWidth=0），拼出来的 URL 没有尺寸后缀，直接 404。
   *
   * 这个 URL 也是网格缩略图用的 URL（`thumbnailSizes` 只有一档 720，任何尺寸都落到它），
   * 所以进灯箱时浏览器会复用网格正在下 / 已经下好的那一份，不会再拉一遍；
   * 服务端对 720 也是 `max-age=1 年`，重进不会回源。
   */
  public thumbOf(item: FlowItem): string {
    return this.lowUrlOf(item);
  }

  /** 底图先到：用它补齐比例，避免滑动中 rebuild 造成位置跳变 */
  public onThumbLoad(item: FlowItem, event: Event): void {
    const img = event.target as HTMLImageElement;
    this.fixRatio(item, img.naturalWidth, img.naturalHeight);
  }

  public onPosterLoad(item: FlowItem, event: Event): void {
    const img = event.target as HTMLImageElement;
    item.posterDecoded = true;
    this.fixRatio(item, img.naturalWidth, img.naturalHeight);
  }

  public onPosterError(item: FlowItem): void {
    // 封面失败就当没有海报：底下还有缩略图，播放按钮仍可用
    item.posterDecoded = true;
  }

  public onImageLoad(item: FlowItem, event: Event): void {
    const img = event.target as HTMLImageElement;
    this.fixRatio(item, img.naturalWidth, img.naturalHeight);
    this.reveal(item, img);
  }

  public onImageError(item: FlowItem): void {
    // 高清档（2160 预览档）失败：换回磁盘上现成的 720，别留一片空。
    // 粘性 URL 的副作用是「失败也会被粘住」，所以这里必须显式换一次源。
    if (item.fullSrc && !item.previewFailed && item.fullSrc !== this.lowUrlOf(item)) {
      item.previewFailed = true;
      item.hdPath = undefined;
      item.loaded = false;
      item.failed = false;
      item.fullSrc = this.lowUrlOf(item);
      this.cd.detectChanges();
      return;
    }
    item.failed = true;
    item.loaded = true;
  }

  public playVideo(item: FlowItem, event?: Event): void {
    event?.stopPropagation();
    item.playing = true;
  }

  public toggleHud(): void {
    this.hudVisible = !this.hudVisible;
  }

  // ------------------------------------------------------------- 双指放大

  /**
   * 双指放大 → 当前这张换成真原图。
   *
   * 这里不自己实现缩放：「放大」用的是浏览器原生缩放（index.html 只写了
   * initial-scale，没禁 user-scalable），所以只需要监听「放大发生了」这件事。
   * 原因是 2160 档在原生 2~3 倍放大下就明显发虚，而原图是磁盘上现成的 JPEG，
   * 不需要服务端再算什么 —— 就是把「看得清」交回原图。
   *
   * 两条触发线：
   *   1. visualViewport.scale > 1.05（标准做法，Safari / Chrome 移动端都支持）
   *   2. 两指距离被拉开 12% 以上（兜底：没有 visualViewport 的 webview）
   * 只升不降：原图下下来就留着，松手缩回去再放大不用重来。
   */
  private startZoomWatch(): void {
    const vv = (window as unknown as {visualViewport?: VisualViewport}).visualViewport;
    if (!vv || typeof vv.addEventListener !== 'function') {
      return;
    }
    this.vvHandler = (): void => {
      if (vv.scale > 1.05) {
        this.escalateToOriginal();
      }
    };
    vv.addEventListener('resize', this.vvHandler, {passive: true});
  }

  private stopZoomWatch(): void {
    const vv = (window as unknown as {visualViewport?: VisualViewport}).visualViewport;
    if (vv && this.vvHandler) {
      vv.removeEventListener('resize', this.vvHandler);
    }
    this.vvHandler = null;
    this.pinchDist = 0;
  }

  @HostListener('touchstart', ['$event'])
  public onPinchStart(e: TouchEvent): void {
    this.pinchDist = e.touches.length === 2
      ? VerticalFlowLightboxComponent.touchSpan(e.touches)
      : 0;
  }

  @HostListener('touchmove', ['$event'])
  public onPinchMove(e: TouchEvent): void {
    if (e.touches.length !== 2 || this.pinchDist <= 0) {
      return;
    }
    const d = VerticalFlowLightboxComponent.touchSpan(e.touches);
    if (d / this.pinchDist > 1.12) {
      this.escalateToOriginal();
    }
  }

  @HostListener('touchend')
  @HostListener('touchcancel')
  public onPinchEnd(): void {
    this.pinchDist = 0;
  }

  private static touchSpan(t: TouchList): number {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 把当前这张切成原图；同一张只切一次 */
  private escalateToOriginal(): void {
    if (!this.opened) {
      return;
    }
    const it = this.items[this.current];
    if (!it || !it.gridMedia.isPhoto() || it.origMode) {
      return;
    }
    it.origMode = true;
    // 丢掉已缓存的 2160 URL，重新拼成原图。
    // 只改 fullSrc 这一个字段：元素不重挂、也不摘掉，浏览器会一直画着旧的 2160，
    // 直到原图解码完成才替换 —— 所以放大这一步不会闪。
    it.hdPath = it.gridMedia.getOriginalMediaPath();
    it.fullSrc = it.hdPath;
    this.cd.detectChanges();
  }

  public trackIndex(_: number, w: FlowWindowItem): number {
    return w.index;
  }

  // ------------------------------------------------------------------ 内部

  /** 界面缩放（50~150）→ 抵消系数（0.8 → 1.25，100 → 1） */
  private static inverseZoomFromConfig(): number {
    const raw = Number(Config.Gallery.interfaceZoom);
    const pct = isFinite(raw) && raw > 0 ? Math.min(150, Math.max(50, raw)) : 100;
    return pct === 100 ? 1 : 100 / pct;
  }

  private static ratioOf(media: MediaDTO): number {
    const size = media?.metadata?.size;
    if (!size || !size.width || !size.height) {
      return 0;
    }
    return size.width / size.height;
  }

  private scroller(): HTMLElement {
    return this.scrollRef?.nativeElement ?? null;
  }

  private fixRatio(item: FlowItem, w: number, h: number): void {
    if (w <= 0 || h <= 0) {
      return;
    }
    const ratio = w / h;
    if (!item.ratioFixed || Math.abs(ratio - item.ratio) / item.ratio > 0.02) {
      this.pendingRatios.set(item, ratio);
      this.scheduleRatioFlush();
    }
  }

  private rebuild(): void {
    const n = this.items.length;
    const width = this.width || window.innerWidth;
    this.pre = new Array<number>(n + 1);
    this.pre[0] = 0;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      // 取整：小数高度会让相邻项之间出现 1px 亮线
      const h = Math.max(1, Math.round(width / this.items[i].ratio));
      this.items[i].height = h;
      acc += h;
      this.pre[i + 1] = acc;
    }
    this.totalHeight = acc;
  }

  private indexAt(y: number): number {
    const n = this.items.length;
    if (n === 0) {
      return 0;
    }
    if (y <= 0) {
      return 0;
    }
    if (y >= this.pre[n]) {
      return n - 1;
    }
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.pre[mid] <= y) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }

  private positionAt(index: number, center: boolean): void {
    const el = this.scroller();
    if (!el || index < 0 || index >= this.items.length) {
      return;
    }
    const h = this.items[index].height;
    const vh = this.viewHeight || el.clientHeight;
    let target = this.pre[index];
    if (center && h < vh) {
      target -= Math.round((vh - h) / 2);
    }
    el.scrollTop = Math.max(0, target);
    this.current = index;
    this.pinned = true;
    this.pinIndex = index;
    this.pinY = el.scrollTop;
  }

  private updateWindow(force: boolean): void {
    const el = this.scroller();
    const n = this.items.length;
    if (!el || n === 0) {
      return;
    }
    const st = el.scrollTop;
    const vh = this.viewHeight || el.clientHeight;
    const prevCurrent = this.current;
    if (this.pinned) {
      this.current = this.pinIndex;
    } else {
      this.current = this.indexAt(st + vh / 2);
    }
    const first = this.indexAt(st);
    let last = first;
    while (last + 1 < n && this.pre[last + 1] <= st + vh) {
      last++;
    }
    const from = Math.max(0, first - MOUNT_BEHIND);
    const to = Math.min(n - 1, last + MOUNT_AHEAD);
    // 窗口没变：DOM 不动，什么都不做
    if (!force && from === this.winFrom && to === this.winTo) {
      // 但「当前张」可能换了（同一屏内微调）—— 这时 fullSrcOf() 的答案会变，
      // 不刷一次的话高清档永远追不上当前这张。
      if (prevCurrent !== this.current) {
        this.cd.detectChanges();
      }
      return;
    }
    this.winFrom = from;
    this.winTo = to;
    const win: FlowWindowItem[] = [];
    for (let i = from; i <= to; i++) {
      win.push({
        index: i,
        item: this.items[i],
        top: this.pre[i],
        height: this.items[i].height,
      });
    }
    this.windowItems = win;
    this.cd.detectChanges();
    // 预热队列跟着锚点走：甩得远时若还死守打开时的位置，
    // 就是在拿 CPU 生成你早已滑过的图，当前这屏反而排不上队。
    if (!this.fastScrolling && Math.abs(this.current - this.lastPreGenFrom) >= 2) {
      this.schedulePreGen(this.current + 1);
    }
  }

  private scheduleRatioFlush(): void {
    if (this.ratioRafId !== null) {
      return;
    }
    this.ratioRafId = requestAnimationFrame((): void => {
      this.ratioRafId = null;
      if (this.fastScrolling) {
        // 甩动中改高度会让下面的项整体跳一下，等停下来再一次性重排
        this.scheduleRatioFlush();
        return;
      }
      this.flushRatios();
    });
  }

  private flushRatios(): void {
    if (this.pendingRatios.size === 0) {
      return;
    }
    const el = this.scroller();
    if (!el) {
      this.pendingRatios.clear();
      return;
    }
    const anchor = this.indexAt(el.scrollTop);
    const off = el.scrollTop - this.pre[anchor];
    this.pendingRatios.forEach((ratio: number, it: FlowItem): void => {
      it.ratio = ratio;
      it.ratioFixed = true;
    });
    this.pendingRatios.clear();
    this.rebuild();
    el.scrollTop = this.pre[anchor] + Math.min(off, this.items[anchor].height);
    if (this.pinned) {
      this.positionAt(this.pinIndex, true);
    }
    this.winFrom = -1;
    this.winTo = -1;
    this.updateWindow(true);
  }

  /**
   * 上屏：等这张图自己解码完再放行，淡入交给 CSS animation。
   *
   * 关键在「什么时候放行」：解码什么时候完成，跟用户滑到哪一屏毫无关系。
   * 滑得快时，一屏糊图刚怼到眼前、解码也刚好完成 —— 整张图就「啪」地变清晰，
   * 这就是体感上的「瞬间加载」。所以甩动期间只把这张塞进 pendingReveal、不上屏，
   * 等停手（setFastScrolling(false)）再统一放行，显影永远发生在你停下来之后。
   *
   * 甩动中 src 一直挂着，解码照常做，所以停手那一刻位图早就好了，
   * 淡入几乎零等待 —— 观感是「对焦」，不是「加载」。
   */
  private reveal(item: FlowItem, img: HTMLImageElement): void {
    const show = (): void => {
      if (item.loaded) {
        return;
      }
      if (this.fastScrolling) {
        this.pendingReveal.add(item);
        return;
      }
      item.loaded = true;
      this.cd.detectChanges();
    };
    if (typeof img.decode === 'function') {
      img.decode().then(show).catch(show);
    } else {
      show();
    }
  }

  /** 停手：把甩动期间攒下的「已解码待显示」一次性放行 */
  private flushPendingReveal(): void {
    if (this.pendingReveal.size === 0) {
      return;
    }
    this.pendingReveal.forEach((it: FlowItem): void => {
      it.loaded = true;
    });
    this.pendingReveal.clear();
    this.cd.detectChanges();
  }

  /**
   * 预热入口：决定「立刻跑」还是「等首屏安静下来再跑」。
   *
   * 有 720 底图：立刻跑 —— 那时非当前张只挂底图，没人抢服务端名额（老行为，不变）。
   *
   * 关掉底图：先等当前张上屏。挂载窗口里那几张正在申请 MAX_CONCURRENT(2) 的名额，
   * 这时候插一条预热进来会分掉一半并行度（实测首屏 4.6 s → 5.0 s，白等 400 ms）。
   */
  private schedulePreGen(from: number): void {
    this.clearPreGenTimer();
    if (this.tuning.lowEnabled) {
      this.startPreGen(from);
      return;
    }
    this.lastPreGenFrom = from;
    this.waitAndPreGen(from, 0);
  }

  /** 每 PREGEN_DELAY_MS 看一次当前张上屏没；最多等 PREGEN_DELAY_MAX 轮就照跑 */
  private waitAndPreGen(from: number, tries: number): void {
    this.preGenTimer = window.setTimeout((): void => {
      this.preGenTimer = null;
      if (!this.opened) {
        return;
      }
      const cur = this.items[this.current];
      // 还没上屏且没失败 = 窗口里还在排队，再等一轮（失败就别等了，直接跑）
      if (cur && !cur.loaded && !cur.failed && tries < PREGEN_DELAY_MAX) {
        this.waitAndPreGen(from, tries + 1);
        return;
      }
      this.startPreGen(from);
    }, PREGEN_DELAY_MS);
  }

  private clearPreGenTimer(): void {
    if (this.preGenTimer !== null) {
      window.clearTimeout(this.preGenTimer);
      this.preGenTimer = null;
    }
  }

  /**
   * 预热预览档：让服务端把「锚点之后 N 张」提前生成好、放进它的内存缓存。
   *
   * 预热的对象只有一个：**短边 2160 的内存档**（JPEG，服务端现生成、不落盘、关灯箱即释放）。
   * 720 底图在磁盘上现成、原图直接读盘，这两样都不需要预热。
   *
   * 为什么必须预热：冷生成一张 1 亿像素的图要 2.5 s，瓶颈是解码本身，换档位也没用
   * （1440/1080 反而要 8~9 s，因为 8736÷2160 刚好命中 JPEG 的 DCT 1/4 缩小解码）。
   * 所以只能「提前做」，命中后只要 35 ms。
   *
   * 并发固定 1 路（PREGEN_CONCURRENCY）：服务端 MAX_CONCURRENT 只有 2，再开一路就会和
   * 正在上屏的那张抢名额，反而让眼前这张更晚清晰。单路 + 交互请求留位实测更快。
   *
   * 只 GET、不读 body：服务端在发响应头前就把 Buffer 备好了，
   * 浏览器这边不留任何解码位图，不会和当前这张抢内存。
   */
  private startPreGen(from: number): void {
    const count = Math.round(PRE_GEN_COUNT);
    const edge = alignPreviewEdge(PREVIEW_EDGE);
    this.abortPreGen();
    if (count <= 0 || edge <= 0) {
      return;
    }
    this.lastPreGenFrom = from;
    /*
     * 从哪一张开始预热。
     *
     * 有 720 底图：非当前张只挂底图、不取高清档，所以直接从锚点起预热（老行为，不变）。
     *
     * 关掉 720 底图：挂载窗口里每一张都在自己要高清档（见 fullSrcOf）。这时若预热也从
     * 同一批 URL 起，服务端会对同一张图跑两遍 sharp —— MemoryPreviewMWs 只按「已生成」
     * 查缓存，没有 in-flight 去重，CPU 直接翻倍，当前张反而更慢。
     * 所以起点推到挂载窗口之后：那里才是「滑过去还没人准备」的部分，预热才有意义。
     */
    const firstIdx = Math.max(0, this.tuning.lowEnabled
      ? from
      : Math.max(from, this.current + 1 + Math.max(0, MOUNT_AHEAD)));
    const last = Math.min(this.items.length - 1, firstIdx + count - 1);
    const queue: number[] = [];
    for (let i = firstIdx; i <= last; i++) {
      // 当前这张由 <img> 自己在请求，不用抢一个预热名额
      if (i !== this.current) {
        queue.push(i);
      }
    }
    const token = ++this.preGenToken;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this.preGenAbort = ctrl;
    const next = (): void => {
      if (token !== this.preGenToken || !this.opened) {
        return;
      }
      const i = queue.shift();
      if (i === undefined) {
        return;
      }
      const it = this.items[i];
      const url = it ? this.hdUrlOf(it) : '';
      if (!url || url.indexOf('/' + edge) < 0) {
        // 这张本来就该走原图，没什么可预热的
        next();
        return;
      }
      const init: RequestInit = {priority: 'low'} as RequestInit;
      // 打个标记让服务端知道这是预热：它只占「并发 2」里的一份，
      // 永远给真正要上屏的那张留一个名额（否则停下来时当前张排在预热后面干等）。
      init.headers = {'X-Pg2-Pregen': '1'};
      if (ctrl) {
        init.signal = ctrl.signal;
      }
      fetch(url, init).then(next, next);
    };
    for (let k = 0; k < PREGEN_CONCURRENCY; k++) {
      next();
    }
  }

  /** 掐掉还在跑 / 还在排队的预热请求（把服务端名额让出来），顺带取消还没到点的延迟预热 */
  private abortPreGen(): void {
    this.clearPreGenTimer();
    if (this.preGenAbort) {
      try {
        this.preGenAbort.abort();
      } catch (e) {
        // ignore
      }
      this.preGenAbort = null;
    }
  }

  /** 关灯箱：让服务端把内存里的预览档放掉（这些图本来就不该留在任何地方） */
  private static clearPreviewCache(): void {
    try {
      fetch(Utils.concatUrls(Config.Server.urlBase, Config.Server.apiPath, '/gallery/preview-cache'), {
        cache: 'no-store',
        keepalive: true,
      }).catch((): void => undefined);
    } catch (e) {
      // 清理失败无所谓：服务端有 LRU 上限，进程退出也会释放
    }
  }

  /**
   * 甩动状态。控制三件事：
   *   1. `fullSrcOf()` 首次绑定 —— 甩动中只有当前张能要 2160；
   *   2. `reveal()` —— 甩动中解码完也不上屏，等停手统一放行；
   *   3. 预热队列 —— 甩动即掐断（2.5 s/张的生成会把 CPU 吃满，当前屏反而更慢）。
   * 用「到期时间戳 + 单 timer 续期」，避免甩动时每帧 clearTimeout/setTimeout。
   */
  private setFastScrolling(on: boolean): void {
    if (on) {
      this.fastUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + FAST_SETTLE_MS;
      if (this.fastTimer === null) {
        this.fastTimer = window.setTimeout((): void => this.settleFastScrolling(), FAST_SETTLE_MS);
      }
      if (this.fastScrolling) {
        return;
      }
      this.fastScrolling = true;
      // 甩动中把预热全部掐掉：2.5 s/张的生成会把 CPU 吃满，
      // 当前屏那几张反而更慢。停手后再重新排队。
      this.preGenToken++;
      this.abortPreGen();
      this.cd.detectChanges();
      return;
    }
    if (!this.fastScrolling) {
      return;
    }
    this.fastScrolling = false;
    this.flushPendingReveal();
    this.cd.detectChanges();
    this.lastPreGenFrom = -2;
    this.schedulePreGen(this.current + 1);
    if (this.pendingRatios.size > 0) {
      this.scheduleRatioFlush();
    }
  }

  private settleFastScrolling(): void {
    this.fastTimer = null;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const left = this.fastUntil - now;
    if (left > 0) {
      this.fastTimer = window.setTimeout((): void => this.settleFastScrolling(), left);
      return;
    }
    this.setFastScrolling(false);
  }

  /** 把底色写到宿主（设置页唯一需要运行时下发的样式）；淡入时长是固定值，写在 CSS 里 */
  private applyVoidColor(): void {
    const el = this.host?.nativeElement as HTMLElement;
    if (!el) {
      return;
    }
    el.style.setProperty('--vf-void', this.tuning.voidColor);
  }

  private reset(): void {
    this.cancelFrames();
    this.opened = false;
    this.items = [];
    this.windowItems = [];
    this.pre = [0];
    this.totalHeight = 0;
    this.current = 0;
    this.hudVisible = false;
    this.winFrom = -1;
    this.winTo = -1;
    this.pinned = false;
    this.pinIndex = 0;
    this.pinY = 0;
    this.stopZoomWatch();
    this.pendingRatios.clear();
    this.pendingReveal.clear();
    this.preGenToken++;
    this.abortPreGen();
    this.lastPreGenFrom = -2;
    this.fastScrolling = false;
    if (this.fastTimer !== null) {
      clearTimeout(this.fastTimer);
      this.fastTimer = null;
    }
    this.fastUntil = 0;
    this.lastScrollTop = 0;
    this.lastScrollTime = 0;
  }

  private cancelFrames(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    if (this.ratioRafId !== null) {
      cancelAnimationFrame(this.ratioRafId);
      this.ratioRafId = null;
    }
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
  }
}
