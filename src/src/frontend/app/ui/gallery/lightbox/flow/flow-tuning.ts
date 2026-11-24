import {Config} from '../../../../../../common/config/public/Config';

/**
 * 竖图流「可调项」—— 只剩两个设置页开关：底图颜色、是否加载 720 底图。
 *
 * 历史上这里有 12 个参数（预载、解码保活、720 预热、滚动时序…）外加一套
 * localStorage 覆盖层 + 诊断面板滑块。这些已经全部固化成常量：
 *   - 多数调了没有收益（预载/解码保活实测不如交给浏览器）
 *   - 少数只在踩坑时有用（并发、预热张数），调完就该写进代码
 *   - localStorage 覆盖还会造成"设置关了但还生效"的幽灵问题
 * 常量列表见文件下半部分。改它们要重新构建，没有运行时入口。
 */
export interface FlowTuning {
  /** 底图（图片未到位时露出的底色） */
  voidColor: string;
  /** 是否加载 720 底图（设置页唯一的行为开关） */
  lowEnabled: boolean;
}

/** 后端没下发时的兜底 */
const FLOW_DEFAULTS: FlowTuning = {
  voidColor: '#4e4636',
  lowEnabled: true,
};

/**
 * 取生效参数：内置默认 → 设置页（Config.Gallery）。
 *
 * 刻意只认这两个字段：其它参数曾经也能被 localStorage 覆盖，
 * 结果出现"设置里关了、手机上还开着"的排查地狱（每条设备一份覆盖）。
 */
export function readTuning(): FlowTuning {
  const out: FlowTuning = {...FLOW_DEFAULTS};
  try {
    const gallery = (Config as unknown as {Gallery?: Record<string, unknown>}).Gallery;
    if (gallery) {
      const color = gallery.flowVoidColor;
      if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)) {
        out.voidColor = color;
      }
      const low = gallery.flowLowEnabled;
      if (typeof low === 'boolean' || low === 'true' || low === 'false') {
        out.lowEnabled = low === true || low === 'true';
      }
    }
  } catch (e) {
    // Config 未初始化时不阻塞组件
  }
  return out;
}

/* ------------------------------------------------------------------------- *
 * 以下全部是固化常量（没有设置页入口，改了要重新构建）
 * ------------------------------------------------------------------------- */

/** 临时预览档短边 px。0 = 关闭、永远用原图 */
export const PREVIEW_EDGE = 2160;

/** 打开时预热张数（0 = 不预热） */
export const PRE_GEN_COUNT = 2;

/**
 * 服务端 MemoryPreviewMWs 支持的档位（短边像素）。
 * 必须与后端 `SIZES` 一致 —— 前端按这份白名单对齐 URL，后端认不出就回落 720。
 * 只留 2160：1080 / 1440 从上线到现在一次都没被请求过（短边中位数 3024，落到 2160 最优）。
 */
const PREVIEW_SIZES: number[] = [2160];

/** 挂载窗口：向上 / 向下多挂几张（虚拟滚动留白，不是预载） */
export const MOUNT_BEHIND = 1;
export const MOUNT_AHEAD = 2;

/**
 * 甩动判定阈值 px/ms、甩动静默 ms。
 *
 * 这两个不是「观感参数」，是**节流阀**：`fastScrolling` 为真时，`fullSrcOf()` 不给
 * 当前张以外的东西绑 2160、预热队列整体掐掉。删了它们，一次甩动就会连着往服务端
 * 发十几条冷生成（2.5 s/张，MAX_CONCURRENT=2），你真正停下来的那张反而排在垃圾后面。
 *
 * FAST_RATE = 1.2 的来历：视口高 1152px（2048×1152 逻辑像素），1.2 px/ms ≈ **一屏/秒**。
 *   - Android `ViewConfiguration`：fling 区间 50 dp/s ~ 8000 dp/s（0.05 ~ 8 px/ms），
 *     真人快滑一般 2~4 px/ms；1.2 落在「刻意慢慢翻」和「甩」的分界上。
 *   - 实测（throttle_probe.js）：慢拖 0.28 px/ms 不触发、快甩 26 px/ms 触发；
 *     阈值在 0.5~2 之间对这两种场景表现完全一致，所以不必精调。
 *   - 理论上的「浪费边界」是 一屏 ÷ 冷生成 2400ms ≈ 0.48 px/ms（比这更快，图还没生成完就滑走了）。
 *     取 1.2 而不是 0.48 是故意的：宁可多做一点投机生成，换取「慢拖时也在逐步变清晰」。
 *
 * FAST_SETTLE_MS = 200 的来历：桌面滚轮连续滚动时相邻事件约 50~120ms，
 *   真停手（换手/思考）≥ 250ms，200 正好卡在中间。
 *   不能用原生 `scrollend` 顶替 —— 实测（scrollend_probe.js）滚轮每响一格它就发一次
 *   （8 格 = 8 次、PageDown 1 次、慢滚 4 格 = 4 次），它回答的是「这一格滚完了」，
 *   不是「人停手了」；拿它当信号会在每格之间反复开关节流，等于没有节流。
 */
export const FAST_RATE = 1.2;
export const FAST_SETTLE_MS = 200;

/**
 * 改窗口后的重排防抖 ms。
 *
 * 拖拽窗口会连发几十个 resize，每个都 rebuild（全量重算高度 + 重排 DOM）会卡。
 * 100~250ms 是这类防抖的常规区间，140 取偏快的一侧：窗口一停手马上重排，不拖泥带水。
 */
export const RESIZE_SETTLE_MS = 140;

/** 把任意输入对齐到最近的可支持档位；0 表示关闭 */
export function alignPreviewEdge(raw: number): number {
  if (!isFinite(raw) || raw <= 0) {
    return 0;
  }
  for (const s of PREVIEW_SIZES) {
    if (raw <= s) {
      return s;
    }
  }
  return PREVIEW_SIZES[PREVIEW_SIZES.length - 1];
}
