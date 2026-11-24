/**
 * 甩动节流 / 短淡入 到底还有没有用？—— 纯观测，不改任何配置
 *
 * 问题来源：「720 底图 + 2160 粘性」这套方案上线后，
 *   FAST_RATE / FAST_SETTLE_MS（甩动判定）、FADE_MS / FAST_FADE_MS（淡入时长）
 *   是不是已经被新方案取代、可以删掉？
 *
 * 观测四件事：
 *   1. 快甩期间 → 服务端收到几条 2160 请求；窗口里进出过多少张
 *      （后者 = 若不节流、这些张会立刻各发一条 2160 冷生成）
 *   2. 快甩期间 → 每帧的底图层数 / 大图层数（判断「只挂底图」有没有被破坏）
 *   3. 停手 → 当前张多久变清晰、这期间发了哪几条 2160
 *   4. 慢拖（rate < 1.2）→ 是否允许升级（对照，说明为什么不能只看时间）
 *
 * 用法：BASE=http://192.168.0.10:8282 node throttle_probe.js
 *       DIR="未压缩4/蠢沫沫 宴" node throttle_probe.js
 */
const {chromium} = require('playwright-core');

const HOST = '192.168.0.10';
const BASE = process.env.BASE || 'http://192.168.0.10:8282';
const DIR = (process.env.DIR || '未压缩4/蠢沫沫 宴').split('/');
const HEADFUL = process.env.HEADFUL === '1';
const HOPS = Number(process.env.HOPS || 8);
const SETTLE_WAIT = Number(process.env.SETTLE_WAIT || 4000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 页面内取样：每帧记滚动位置、窗口项数、底图/大图层数；另记 vf-ok 类名变化的时刻
function installSampler() {
  window.__probe = {frames: [], reveals: [], stop: false};
  const tick = () => {
    if (window.__probe.stop) { return; }
    const sc = document.querySelector('.vf-scroll');
    const tops = [];
    document.querySelectorAll('.vf-item').forEach((e) => {
      const m = /translate3d\(0px,\s*(-?\d+)px/.exec(e.style.transform || '');
      if (m) { tops.push(Number(m[1])); }
    });
    window.__probe.frames.push({
      t: Math.round(performance.now()),
      top: sc ? Math.round(sc.scrollTop) : -1,
      bg: document.querySelectorAll('.vf-item img.vf-bg').length,
      full: document.querySelectorAll('.vf-item img.vf-full').length,
      items: tops.length,
      tops: tops.join(','),
      okAll: document.querySelectorAll('.vf-item img.vf-ok').length,
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const mo = new MutationObserver((recs) => {
    for (const r of recs) {
      const el = r.target;
      if (!el.classList || !el.classList.contains('vf-ok')) { continue; }
      const was = (r.oldValue || '').split(/\s+/);
      if (was.indexOf('vf-ok') >= 0) { continue; }
      window.__probe.reveals.push({
        t: Math.round(performance.now()),
        full: document.querySelectorAll('.vf-item img.vf-full').length,
        cls: el.className,
        src: (el.getAttribute('src') || '').split('/').slice(-1)[0],
      });
    }
  });
  mo.observe(document.body, {subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true});
}

function classify(url) {
  const m = url.match(/\/pgapi\/gallery\/content\/(.+)$/);
  if (!m) { return null; }
  const last = decodeURIComponent(m[1].split('/').pop());
  const m2 = last.match(/^(\d+)$/);
  return m2 ? 'edge' + m2[1] : 'thumb';
}

async function openLightbox(page) {
  await page.goto(BASE + '/gallery/', {waitUntil: 'domcontentloaded'});
  await sleep(2200);
  for (const want of DIR) {
    const dirs = page.locator('.directories a');
    const n = await dirs.count();
    let at = -1;
    for (let i = 0; i < n; i++) {
      const t = ((await dirs.nth(i).innerText()) || '').trim();
      if (t.indexOf(want) >= 0) { at = i; break; }
    }
    if (at < 0) { throw new Error('找不到目录: ' + want); }
    await dirs.nth(at).click();
    await sleep(2000);
  }
  await page.locator('app-gallery-grid-photo:not(:has(.video-indicator))').first().click();
  for (let i = 0; i < 300; i++) {
    const ok = await page.evaluate(() => !!(document.querySelector('.vf-item img.vf-full.vf-ok')));
    if (ok) { break; }
    await sleep(20);
  }
  await sleep(900);
  let lastN = -1, idle = 0;
  for (let i = 0; i < 300; i++) {
    const n = await page.evaluate(() => performance.getEntriesByType('resource').length);
    if (n === lastN) { idle++; if (idle >= 8) { break; } } else { idle = 0; lastN = n; }
    await sleep(100);
  }
}

async function fling(page, hops, vhFrac, gapMs) {
  for (let i = 0; i < hops; i++) {
    await page.evaluate((f) => {
      const sc = document.querySelector('.vf-scroll');
      sc.scrollTop += Math.round(sc.clientHeight * f);
      sc.dispatchEvent(new Event('scroll'));
    }, vhFrac);
    await sleep(gapMs);
  }
}

async function slowDrag(page, steps, pxPerStep, gapMs) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate((px) => {
      const sc = document.querySelector('.vf-scroll');
      sc.scrollTop += px;
      sc.dispatchEvent(new Event('scroll'));
    }, pxPerStep);
    await sleep(gapMs);
  }
}

function seg(frames, t0, t1) {
  const s = frames.filter((f) => f.t >= t0 && f.t <= t1);
  if (!s.length) { return {n: 0}; }
  const tops = new Set();
  s.forEach((f) => f.tops.split(',').filter(Boolean).forEach((x) => tops.add(x)));
  const avgBg = s.reduce((a, f) => a + (f.bg || 0), 0) / s.length;
  return {
    帧数: s.length,
    ms: s[s.length - 1].t - s[0].t,
    topFrom: s[0].top,
    topTo: s[s.length - 1].top,
    平均底图层数: +avgBg.toFixed(2),
    最多大图层数: Math.max(...s.map((f) => f.full || 0)),
    窗口最多个数: Math.max(...s.map((f) => f.items)),
    窗口进出张数: tops.size,
  };
}

async function main() {
  const browser = await chromium.launch({
    headless: !HEADFUL,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox'],
  });
  const ctx = await browser.newContext({viewport: {width: 1280, height: 900}, ignoreHTTPSErrors: true});
  await ctx.addCookies([{name: 'pigallery2-lang', value: 'zh', domain: HOST, path: '/'}]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);

  const net = [];
  page.on('request', (r) => {
    const c = classify(r.url());
    if (c) { net.push({t: Date.now(), kind: c, url: r.url()}); }
  });

  await page.request.post(BASE + '/pgapi/user/login', {
    data: {loginCredential: {username: 'ffvz', password: 'z7850191'}},
  });
  await openLightbox(page);
  await page.evaluate(installSampler);

  const mark = () => page.evaluate(() => Math.round(performance.now()));
  const by = (a, b) => {
    const all = net.filter((x) => x.t >= a && x.t <= b);
    const o = {};
    for (const x of all) { o[x.kind] = (o[x.kind] || 0) + 1; }
    return {total: all.length, 明细: o};
  };

  // ---------------- A. 快甩 ----------------
  const a0 = await mark(); const wa0 = Date.now();
  await fling(page, HOPS, 1.5, 30);
  const a1 = await mark(); const wa1 = Date.now();
  const flingReq = by(wa0, wa1);
  const settleReq = by(wa1, Date.now() + SETTLE_WAIT);
  const tStop = Date.now();
  // 等停手后的清晰化
  let firstOk = -1;
  for (let i = 0; i < SETTLE_WAIT / 25; i++) {
    const ok = await page.evaluate(() => {
      const sc = document.querySelector('.vf-scroll');
      const cy = sc.getBoundingClientRect().top + sc.clientHeight / 2;
      const el = [...document.querySelectorAll('.vf-item')].find((e) => {
        const r = e.getBoundingClientRect();
        return r.top <= cy && r.bottom >= cy;
      });
      if (!el) { return false; }
      const f = el.querySelector('img.vf-full');
      return !!(f && f.classList.contains('vf-ok') && f.complete && f.naturalWidth > 0);
    });
    if (ok) { firstOk = Date.now() - tStop; break; }
    await sleep(25);
  }
  const settleReqReal = by(wa1, Date.now());
  const framesA = await page.evaluate(() => window.__probe.frames);
  const revealsA = await page.evaluate(() => window.__probe.reveals);
  const sumA = seg(framesA, a0, a1);
  const revealDuringFling = revealsA.filter((r) => r.t >= a0 && r.t <= a1);
  const revealInInstant = [];
  await sleep(1200);

  // ---------------- B. 慢拖 ----------------
  await page.evaluate(() => { window.__probe.frames = []; window.__probe.reveals = []; });
  const b0 = await mark(); const wb0 = Date.now();
  await slowDrag(page, 12, 80, 250);   // 0.32 px/ms
  const b1 = await mark(); const wb1 = Date.now();
  const slowReq = by(wb0, wb1);
  await sleep(1500);
  const framesB = await page.evaluate(() => window.__probe.frames);
  const sumB = seg(framesB, b0, b1);

  console.log(JSON.stringify({
    base: BASE,
    dir: DIR.join('/'),
    快甩: Object.assign({}, sumA, {
      平均速率px每ms: sumA.ms ? +((sumA.topTo - sumA.topFrom) / sumA.ms).toFixed(2) : -1,
      期间2160请求: flingReq,
      期间新增上屏次数: revealDuringFling.length,
      其中甩动中已挂大图: revealInInstant.length,
      上屏明细: revealDuringFling.slice(0, 8),
    }),
    停手: {
      首张清晰ms: firstOk,
      期间2160请求: settleReqReal,
      请求明细: net.filter((x) => x.t >= wa1 && x.t <= Date.now()).map((x) => x.url.split('/').slice(-1)[0]),
    },
    慢拖: Object.assign({}, sumB, {
      平均速率px每ms: sumB.ms ? +((sumB.topTo - sumB.topFrom) / sumB.ms).toFixed(2) : -1,
      期间2160请求: slowReq,
    }),
  }, null, 2));
  await page.keyboard.press('Escape').catch(() => undefined);
  await browser.close();
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
