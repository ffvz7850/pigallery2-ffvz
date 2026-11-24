import {NextFunction, Request, Response} from 'express';
import * as sharp from 'sharp';
import {Config} from '../../../common/config/private/Config';
import {PhotoProcessing} from '../../model/fileaccess/fileprocessing/PhotoProcessing';

/**
 * 竖图流「临时预览档」—— 只在内存里，不落盘。
 *
 * 背景：PiGallery2 的 `thumbnailSizes` 请求一律经 `PhotoProcessing.generateThumbnail`
 * 生成到 `tempFolder/tc` 并长期留在磁盘上。竖图流要的 2160 档只服务「这一眼看清」，
 * 看过就没用，按库容量算会吃掉几十 GB，不值得。
 *
 * 做法：sharp 直接出 Buffer 返回，进程内做一个小 LRU：
 *   - 命中 → 立刻返回（0 磁盘 IO）
 *   - 未命中 → 现生成（0.2~0.8 s），放回内存
 * 关闭灯箱时前端 GET `/pgapi/gallery/preview-cache` 清空（用 GET 不用 DELETE：
 * 它只清进程内内存、不碰任何数据，避开 CSRF 拦截更省事）；进程退出自然释放。
 * 磁盘上不会多出任何文件。
 *
 * **编码用 JPEG 而不是 WebP**（1.3.19 的实测结论，见下）：瓶颈根本不在缩放，
 * 而在编码器本身。同一张 3024² 的图，缩放到 2160 后：
 *
 *   decode-only      68 ms
 *   → webp e2       896 ms   298 KB     ← 编码吃掉 800 ms
 *   → jpeg q80      176 ms   464 KB     ← 编码只要 100 ms
 *
 * 4000×6000 是 1510→423 ms，5792×8688 是 1819→757 ms，稳定 2.4~5 倍。
 * 代价是文件大 1.3~1.9 倍（700 KB 在局域网上约 10 ms），换来的是 CPU 和等待都少一截。
 * 带透明通道的图仍然出 webp —— JPEG 没有 alpha，压平会变成黑底。
 */
export interface Preview {
  buf: Buffer;
  mime: string;
}

export class MemoryPreviewMWs {
  /**
   * 支持的预览档位（短边像素）。
   * 必须与前端 flow-tuning.ts 的 PREVIEW_SIZES 一致 —— 前端拼接 URL 时按这份白名单对齐，
   * 不认识的档位会被 `thumbnailSizes` 校验回落成 720，反而更糊。
   *
   * 只留 2160：1080 / 1440 从上线到现在一次都没被请求过。抽样 160 张 JPEG 的短边中位数
   * 是 3024，落到 2160 这一档最省（8736÷2160 正好命中 JPEG 的 1/4 缩小解码）。
   */
  public static readonly SIZES: number[] = [2160];
  /** 内存上限：条数与字节数，先到先淘汰（LRU） */
  private static readonly MAX_ITEMS = 24;
  private static readonly MAX_BYTES = 96 * 1024 * 1024;
  /**
   * 同时生成的任务数。这个值直接决定 CPU 峰值：
   * 实测 4~5 张并发时容器 CPU 到 334%（4 核上限 400%），事件循环和磁盘 IO
   * 被挤到后面，720 底图跟着一起卡。限到 2，峰值约 170~200%，留一半给系统。
   * 单张冷生成约 2.7 s，所以吞吐约 1.3 s/张 —— 和正常浏览速度匹配。
   */
  private static readonly MAX_CONCURRENT = 2;
  /** 排队上限（毫秒）：超过就直接给 720 档，宁可糊一点也不让人干等 */
  private static readonly QUEUE_TIMEOUT_MS = 8000;
  /** 排队轮询间隔（毫秒）：顺便用来发现客户端已经断开 */
  private static readonly POLL_MS = 40;

  private static cache = new Map<string, Preview>();
  private static bytes = 0;
  private static active = 0;

  /** 是预览档就返回该档位数字，否则 0 */
  public static sizeOf(raw: unknown): number {
    const n = parseInt(String(raw), 10);
    if (!isFinite(n)) {
      return 0;
    }
    return MemoryPreviewMWs.SIZES.indexOf(n) >= 0 ? n : 0;
  }

  public static async handle(
    size: number,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (!req.resultPipe) {
      return next();
    }
    const mediaPath = req.resultPipe as string;
    const key = mediaPath + '@' + size;

    // 命中内存：直接发，不占生成名额（这时只有几毫秒）
    const hit = MemoryPreviewMWs.cache.get(key);
    if (hit) {
      MemoryPreviewMWs.cache.delete(key);
      MemoryPreviewMWs.cache.set(key, hit);
      MemoryPreviewMWs.send(res, hit, true);
      return;
    }

    const slot = await MemoryPreviewMWs.acquire(req, res);
    if (slot === 'aborted') {
      // 客户端已经走了（滑过去了 / 关灯箱了），别白烧 CPU
      return;
    }
    if (slot === 'timeout') {
      return MemoryPreviewMWs.fallback(res, mediaPath, next);
    }
    try {
      const buf = await MemoryPreviewMWs.render(mediaPath, size);
      MemoryPreviewMWs.put(key, buf);
      MemoryPreviewMWs.send(res, buf, false);
    } catch (e) {
      return next();
    } finally {
      MemoryPreviewMWs.release();
    }
  }

  /**
   * 排队名额。返回 ok 才能生成；aborted 表示客户端已经断开（直接放弃）；
   * timeout 表示排太久（降级到 720，别让人干等）。
   *
   * 预热请求（前端带 X-Pg2-Pregen: 1 的 fetch）只能用到 MAX_CONCURRENT - 1：
   * 必须永远给「真正要上屏的那一张」留一个名额，否则停下来时当前张会排在
   * 预热队列后面干等，又回到「等一会儿才清晰」。
   */
  private static async acquire(req: Request, res: Response): Promise<'ok' | 'aborted' | 'timeout'> {
    const isPre = String(req.headers['x-pg2-pregen'] || '') === '1';
    const limit = Math.max(1, MemoryPreviewMWs.MAX_CONCURRENT - (isPre ? 1 : 0));
    const deadline = Date.now() + MemoryPreviewMWs.QUEUE_TIMEOUT_MS;
    while (MemoryPreviewMWs.active >= limit) {
      if (req.destroyed || res.destroyed || res.writableEnded) {
        return 'aborted';
      }
      if (Date.now() > deadline) {
        return 'timeout';
      }
      await new Promise((r) => setTimeout(r, MemoryPreviewMWs.POLL_MS));
    }
    MemoryPreviewMWs.active++;
    return 'ok';
  }

  private static release(): void {
    if (MemoryPreviewMWs.active > 0) {
      MemoryPreviewMWs.active--;
    }
  }

  private static send(res: Response, p: Preview, cached: boolean): void {
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('X-Pg2-Preview', cached ? 'memory-hit' : 'memory');
    res.type(p.mime).send(p.buf);
  }

  /**
   * 降级：直接把已有的 720 档发回去（磁盘命中，几十毫秒）。
   * 带 no-store —— 免得上屏后被浏览器当成 2160 缓存住，下次想拿清晰版还得不到了。
   */
  private static fallback(res: Response, mediaPath: string, next: NextFunction): void {
    try {
      const smallest = Math.min(...Config.Media.Photo.thumbnailSizes);
      const p = PhotoProcessing.generateConvertedPath(mediaPath, smallest);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Pg2-Preview', 'fallback');
      res.sendFile(p, (err?: Error): void => {
        if (err) {
          next();
        }
      });
    } catch (e) {
      next();
    }
  }

  public static clear(): void {
    MemoryPreviewMWs.cache.clear();
    MemoryPreviewMWs.bytes = 0;
  }

  public static stats(): { items: number; bytes: number; active: number } {
    return {
      items: MemoryPreviewMWs.cache.size,
      bytes: MemoryPreviewMWs.bytes,
      active: MemoryPreviewMWs.active,
    };
  }

  private static async render(p: string, size: number): Promise<Preview> {
    const img = sharp(p, {failOnError: false});
    img.rotate();
    const meta = await img.metadata();
    const kernel =
      Config.Media.Photo.useLanczos3 === true
        ? sharp.kernel.lanczos3
        : sharp.kernel.nearest;
    const w = meta.width || 0;
    const h = meta.height || 0;
    // 与 PhotoWorker 一致：短边缩到 size，不放大
    if (h > w) {
      img.resize(Math.min(size, w), null, {kernel});
    } else {
      img.resize(null, Math.min(size, h), {kernel});
    }

    /*
     * JPEG 还是 WebP：只看有没有透明通道。
     *   - 没有 alpha（照片的绝大多数）：JPEG，编码快 3~5 倍
     *   - 有 alpha：留 WebP，JPEG 会把透明区域压平成黑底
     */
    const useJpeg = meta.hasAlpha !== true;
    const out = useJpeg
      ? await img.jpeg({
        quality: Config.Media.Photo.quality,
        mozjpeg: false, // libjpeg-turbo：比 mozjpeg 快一大截，体积差 5% 以内
        chromaSubsampling: '4:2:0',
        progressive: false,
        optimiseCoding: true,
      }).toBuffer()
      : await img.webp({
        effort: 2,
        quality: Config.Media.Photo.quality,
        smartSubsample: Config.Media.Photo.smartSubsample,
      }).toBuffer();

    return {
      buf: out,
      mime: useJpeg ? 'image/jpeg' : 'image/webp',
    };
  }

  private static put(k: string, v: Preview): void {
    if (MemoryPreviewMWs.cache.has(k)) {
      MemoryPreviewMWs.bytes -= MemoryPreviewMWs.cache.get(k).buf.length;
      MemoryPreviewMWs.cache.delete(k);
    }
    MemoryPreviewMWs.cache.set(k, v);
    MemoryPreviewMWs.bytes += v.buf.length;
    while (
      MemoryPreviewMWs.cache.size > 1 &&
      (MemoryPreviewMWs.cache.size > MemoryPreviewMWs.MAX_ITEMS ||
        MemoryPreviewMWs.bytes > MemoryPreviewMWs.MAX_BYTES)
      ) {
      const oldest = MemoryPreviewMWs.cache.keys().next();
      if (oldest.done) {
        break;
      }
      MemoryPreviewMWs.bytes -= MemoryPreviewMWs.cache.get(oldest.value).buf.length;
      MemoryPreviewMWs.cache.delete(oldest.value);
    }
  }
}
