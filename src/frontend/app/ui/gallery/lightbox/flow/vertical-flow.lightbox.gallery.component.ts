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

export interface FlowItem {
  index: number;
  gridMedia: GridMedia;
  ratio: number;
  ratioFixed: boolean;
  height: number;
  loaded: boolean;
  failed: boolean;
  playing: boolean;
}

export interface FlowWindowItem {
  index: number;
  item: FlowItem;
  top: number;
  height: number;
}

const DEFAULT_RATIO = 3 / 4;
const PREFETCH_AHEAD = 3;
const PREFETCH_BEHIND = 1;
const PREFETCH_CONCURRENCY = 2;

/**
 * 竖向连续浏览（原图）。自包含组件：自己管虚拟滚动、定位、比例纠正与预载。
 * 只读取 GridMedia 的 URL 构造能力，不改动网格与灯箱的既有逻辑。
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
  public items: FlowItem[] = [];
  public windowItems: FlowWindowItem[] = [];
  public totalHeight = 0;
  public current = 0;
  /** 点击画面可隐藏计数与关闭键，再点恢复 */
  public hudVisible = true;

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
  private prefetchQueue: number[] = [];
  private prefetching = new Set<number>();
  private prefetched = new Set<number>();

  constructor(private cd: ChangeDetectorRef) {
  }

  get ItemCount(): number {
    return this.items.length;
  }

  get CurrentIndex(): number {
    return this.current;
  }

  public isOpen(): boolean {
    return this.opened;
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
    this.items = list.map((gm: GridMedia, i: number): FlowItem => {
      const ratio = VerticalFlowLightboxComponent.ratioOf(gm.media);
      return {
        index: i,
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
    return media;
  }

  public scrollToIndex(index: number): void {
    if (!this.opened || this.items.length === 0) {
      return;
    }
    const i = Math.max(0, Math.min(index, this.items.length - 1));
    this.positionAt(i, true);
    this.pinned = true;
    this.pinIndex = i;
    this.pinY = this.scroller()?.scrollTop ?? 0;
    this.updateWindow(true);
  }

  public scrollToMedia(media: MediaDTO): void {
    const i = this.items.findIndex((it: FlowItem): boolean => it.gridMedia.media === media);
    if (i !== -1) {
      this.scrollToIndex(i);
    }
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
    const el = this.scroller();
    if (!this.opened || !el) {
      return;
    }
    const anchor = this.indexAt(el.scrollTop);
    const off = el.scrollTop - this.pre[anchor];
    this.width = el.clientWidth || window.innerWidth;
    this.viewHeight = el.clientHeight || window.innerHeight;
    this.rebuild();
    el.scrollTop = this.pre[anchor] + Math.min(off, this.items[anchor].height);
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

  public srcOf(item: FlowItem): string {
    return item.gridMedia.getOriginalMediaPath();
  }

  public posterOf(item: FlowItem): string {
    return item.gridMedia.getBestSizedMediaPath(window.innerWidth, window.innerHeight);
  }

  public videoOf(item: FlowItem): string {
    return item.gridMedia.getBestFitVideoPath();
  }

  public onImageLoad(item: FlowItem, event: Event): void {
    const img = event.target as HTMLImageElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w > 0 && h > 0) {
      const ratio = w / h;
      if (!item.ratioFixed || Math.abs(ratio - item.ratio) / item.ratio > 0.02) {
        this.applyRatio(item, ratio);
      }
    }
    this.reveal(item, img);
  }

  public onImageError(item: FlowItem): void {
    item.failed = true;
    item.loaded = true;
    this.cd.detectChanges();
  }

  public playVideo(item: FlowItem, event?: Event): void {
    // 播放按钮不应触发"点击画面隐藏 HUD"
    event?.stopPropagation();
    item.playing = true;
  }

  public toggleHud(): void {
    this.hudVisible = !this.hudVisible;
  }

  public trackIndex(_: number, w: FlowWindowItem): number {
    return w.index;
  }

  // ------------------------------------------------------------------ 内部

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
    const from = Math.max(0, first - 1);
    const to = Math.min(n - 1, last + 2);
    if (!force && from === this.winFrom && to === this.winTo) {
      this.schedulePrefetch(from, to);
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
    this.schedulePrefetch(from, to);
    this.cd.detectChanges();
  }

  private applyRatio(item: FlowItem, ratio: number): void {
    const el = this.scroller();
    if (!el) {
      return;
    }
    // 锚点补偿：改高度后保持顶部那一张的可见位置不变
    const anchor = this.indexAt(el.scrollTop);
    const off = el.scrollTop - this.pre[anchor];
    item.ratio = ratio;
    item.ratioFixed = true;
    this.rebuild();
    el.scrollTop = this.pre[anchor] + Math.min(off, this.items[anchor].height);
    if (this.pinned) {
      this.positionAt(this.pinIndex, true);
    }
    this.winFrom = -1;
    this.winTo = -1;
    this.updateWindow(true);
  }

  private reveal(item: FlowItem, img: HTMLImageElement): void {
    const show = (): void => {
      if (item.loaded) {
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

  private schedulePrefetch(from: number, to: number): void {
    const n = this.items.length;
    for (let i = to + 1; i <= Math.min(n - 1, to + PREFETCH_AHEAD); i++) {
      this.enqueue(i);
    }
    for (let i = from - 1; i >= Math.max(0, from - PREFETCH_BEHIND); i--) {
      this.enqueue(i);
    }
    this.pump();
  }

  private enqueue(index: number): void {
    if (this.prefetched.has(index)) {
      return;
    }
    this.prefetched.add(index);
    this.prefetchQueue.push(index);
  }

  private pump(): void {
    while (this.prefetching.size < PREFETCH_CONCURRENCY && this.prefetchQueue.length > 0) {
      const index = this.prefetchQueue.shift();
      const item = this.items[index];
      if (!item || !item.gridMedia.isPhoto()) {
        continue;
      }
      const img = new Image();
      this.prefetching.add(index);
      const done = (): void => {
        this.prefetching.delete(index);
        this.pump();
      };
      img.onload = done;
      img.onerror = done;
      img.fetchPriority = 'low';
      img.src = this.srcOf(item);
    }
  }

  private reset(): void {
    this.cancelFrames();
    this.opened = false;
    this.items = [];
    this.windowItems = [];
    this.pre = [0];
    this.totalHeight = 0;
    this.current = 0;
    this.hudVisible = true;
    this.winFrom = -1;
    this.winTo = -1;
    this.pinned = false;
    this.pinIndex = 0;
    this.pinY = 0;
    this.prefetchQueue = [];
    this.prefetching.clear();
    this.prefetched.clear();
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
  }
}
