/**
 * 1.3.21 验证：不闪 + 一张图只下一次
 *
 *  A. 开底图（默认）
 *   1. 打开时只有当前张挂 vf-full，其余只挂 vf-bg（不再有一张图两份 img）
 *   2. DOM 里不存在 vf-bg 与 vf-full 指向同一个 URL 的重复
 *   3. 正常滑动一格：已绑过的 vf-full 元素不被摘掉、src 不改变
 *   4. 同一个 720 / 2160 URL 的真实网络请求都只有 1 次（网格与竖图流共用一份）
 *
 *  B. 关底图
 *   5. 打开时窗口内每张都上屏
 *   6. 甩动过程中：已经上屏的 vf-full 一个都不被移除（这条以前必挂）
 *   7. 甩动过程中：已绑定的 src 一次都不改（以前会 2160→720 再改回来）
 *   8. 停手后新窗口每张都上屏，且滑回原位时复用同一个 URL
 */
const {chromium} = require('playwright-core');
const {setLow, restoreLow, reloadAfterConfig} = require('./low_switch');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || 'https://192.168.0.10:8286';
const DIR = (process.env.DIR || '未压缩4/蠢沫沫 宴').split('/');
const OUT = path.join(__dirname, 'shots', 'v1321');

let pass = 0, fail = 0;
const chk = (n, ok, d) => {
  if (ok) { pass++; console.log('PASS ' + n + (d ? '  ' + d : '')); }
  else { fail++; console.log('FAIL ' + n + '  ' + (d || '')); }
};

const stat = (page) => page.evaluate(() => {
  const items = [...document.querySelectorAll('.vf-item')];
  const fulls = [...document.querySelectorAll('img.vf-full')];
  const bgs = [...document.querySelectorAll('img.vf-bg')];
  const sc = document.querySelector('.vf-scroll');
  const r0 = sc.getBoundingClientRect();
  const cy = r0.top + r0.height / 2;
  const curEl = items.find((e) => {
    const r = e.getBoundingClientRect();
    return r.top <= cy && r.bottom >= cy;
  });
  const src = (el) => (el ? el.getAttribute('src') || '' : '');
  // 同一张图在 DOM 里挂了两份（bg 和 full 同一个 URL）
  const bgSet = new Set(bgs.map(src));
  const dup = fulls.filter((f) => bgSet.has(src(f))).map(src);
  return {
    nItem: items.length,
    nBg: bgs.length,
    nFull: fulls.length,
    hd: fulls.filter((f) => src(f).endsWith('2160')).length,
    low: fulls.filter((f) => src(f).endsWith('720')).length,
    dupCount: dup.length,
    allDone: fulls.length > 0 && fulls.every((f) => f.complete && f.naturalWidth > 0),
    curSrc: src(curEl && curEl.querySelector('img.vf-full')),
  };
});

/** 装 MutationObserver：统计 vf-full 元素增删、src 属性变更 */
const watch = (page) => page.evaluate(() => {
  window.__ev = {add: 0, rm: 0, src: 0, detail: []};
  if (window.__mo) { window.__mo.disconnect(); }
  window.__mo = new MutationObserver((ms) => {
    ms.forEach((m) => {
      m.addedNodes.forEach((n) => {
        if (n.nodeType === 1 && n.classList && n.classList.contains('vf-full')) { window.__ev.add++; }
      });
      m.removedNodes.forEach((n) => {
        if (n.nodeType === 1 && n.classList && n.classList.contains('vf-full')) { window.__ev.rm++; }
      });
      // 只算「把已有的 src 改掉」；oldValue 为空说明这是新元素第一次赋值，不算换源
      if (m.type === 'attributes' && m.attributeName === 'src' && (m.oldValue || '') !== '') {
        window.__ev.src++;
        if (window.__ev.detail.length < 12) {
          const t = m.target;
          window.__ev.detail.push({
            cls: t.className || '',
            from: (m.oldValue || '').slice(-26),
            to: (t.getAttribute('src') || '').slice(-26),
          });
        }
      }
    });
  });
  window.__mo.observe(document.querySelector('.vf-canvas'), {
    childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['src'],
  });
  return true;
});
const readEv = (page) => page.evaluate(() => window.__ev);

async function openDir(page) {
  await page.goto(BASE + '/gallery/', {waitUntil: 'domcontentloaded'});
  await sleep(3000);
  for (const want of DIR) {
    const dirs = page.locator('.directories a');
    const n = await dirs.count();
    let idx = -1;
    for (let i = 0; i < n; i++) {
      const t = ((await dirs.nth(i).innerText()) || '').trim();
      if (t.indexOf(want) >= 0) { idx = i; break; }
    }
    if (idx < 0) { console.log('MISS ' + want); return false; }
    await dirs.nth(idx).click();
    await sleep(2400);
  }
  return true;
}

async function waitAllDone(page, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await stat(page);
    if (s.nFull === s.nItem && s.allDone) return {stat: s, ms: Date.now() - t0};
    await sleep(250);
  }
  return {stat: await stat(page), ms: -1};
}

/** 模拟甩动：16ms 一拍、每拍 120px ≈ 7500px/s */
async function fling(page, n, step) {
  for (let i = 0; i < n; i++) {
    await page.evaluate((d) => {
      const sc = document.querySelector('.vf-scroll');
      sc.scrollTop += d;
      sc.dispatchEvent(new Event('scroll'));
    }, step);
    await sleep(16);
  }
}

/** 每个 URL 的真实网络请求次数（transferSize>0 才算真回源） */
const netDupes = (page) => page.evaluate(() => {
  const map = new Map();
  performance.getEntriesByType('resource').forEach((e) => {
    if (!/\/\d{3,4}$/.test(e.name)) { return; }
    const size = e.transferSize || 0;
    const cur = map.get(e.name) || {n: 0, total: 0};
    cur.total++;
    if (size > 0) { cur.n++; }
    map.set(e.name, cur);
  });
  const out = {sizes: {}, dup720: [], dup2160: [], total720: 0, total2160: 0};
  map.forEach((v, k) => {
    const tag = k.endsWith('2160') ? '2160' : k.endsWith('720') ? '720' : 'other';
    out.sizes[tag] = (out.sizes[tag] || 0) + 1;
    if (tag === '720') { out.total720 += v.total; if (v.n > 1) out.dup720.push(k.split('/').slice(-2).join('/') + '×' + v.n); }
    if (tag === '2160') { out.total2160 += v.total; if (v.n > 1) out.dup2160.push(k.split('/').slice(-2).join('/') + '×' + v.n); }
  });
  return out;
});

(async () => {
  fs.mkdirSync(OUT, {recursive: true});
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true, args: ['--no-sandbox'],
  });
  const ctx = await browser.newContext({viewport: {width: 1280, height: 900}, ignoreHTTPSErrors: true});
  await ctx.addCookies([{name: 'pigallery2-lang', value: 'zh', domain: '192.168.0.10', path: '/'}]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(40000);

  await page.goto(BASE + '/', {waitUntil: 'domcontentloaded'});
  await sleep(1500);
  if (await page.locator('#username').count()) {
    await page.fill('#username', 'ffvz');
    await page.fill('#password', 'z7850191');
    await page.keyboard.press('Enter');
    await sleep(3000);
  }

  // ================= A. 开底图 =================
  // 1.3.23 删掉了 localStorage 覆盖层，只能用真实配置接口切换（并记住原值，结尾恢复）
  const sw = await setLow(page, true);
  console.log('INFO 设 lowEnabled=true ' + JSON.stringify(sw));
  await reloadAfterConfig(page, sleep);
  if (!(await openDir(page))) { console.log('SUMMARY ' + JSON.stringify({pass, fail})); await browser.close(); return; }
  await page.locator('app-gallery-grid-photo:not(:has(.video-indicator))').first().click();
  await sleep(3000);

  let s = await stat(page);
  chk('开底图：打开时只有当前张挂 vf-full', s.nFull === 1, 'nFull=' + s.nFull + ' nItem=' + s.nItem + ' nBg=' + s.nBg);
  chk('开底图：底图每张都在', s.nBg >= s.nItem, 'nBg=' + s.nBg);
  chk('开底图：没有「一张图两份 img」', s.dupCount === 0, 'dup=' + s.dupCount);
  await page.screenshot({path: path.join(OUT, 'a1-low-on.png')});

  // 正常滑动一格：已绑过的元素不能被摘掉、src 不能改
  await watch(page);
  const before = s.curSrc;
  await page.evaluate(() => {
    const sc = document.querySelector('.vf-scroll');
    sc.scrollTop += sc.clientHeight;
    sc.dispatchEvent(new Event('scroll'));
  });
  await sleep(1500);
  let ev = await readEv(page);
  s = await stat(page);
  chk('开底图：滑动中已上屏的元素不被摘', ev.rm === 0, 'rm=' + ev.rm + ' add=' + ev.add);
  chk('开底图：滑动中已绑定 src 不被改', ev.src === 0, 'srcChange=' + ev.src + ' ' + JSON.stringify(ev.detail));
  chk('开底图：滑走的那张仍保留自己的 2160', s.hd >= 1, 'hd=' + s.hd + ' low=' + s.low + ' nFull=' + s.nFull);
  console.log('INFO 开底图 curSrc ' + (before || '').slice(-24) + ' → ' + (s.curSrc || '').slice(-24));

  let net = await netDupes(page);
  chk('同一个 720 URL 只回源一次', net.dup720.length === 0, '重复=' + JSON.stringify(net.dup720.slice(0, 4)) + ' 唯一URL=' + net.sizes['720']);
  chk('同一个 2160 URL 只回源一次', net.dup2160.length === 0, '重复=' + JSON.stringify(net.dup2160.slice(0, 4)) + ' 唯一URL=' + net.sizes['2160']);
  console.log('INFO 网络 ' + JSON.stringify(net.sizes) + ' 720条目=' + net.total720 + ' 2160条目=' + net.total2160);

  // ================= B. 关底图 =================
  await page.keyboard.press('Escape');
  await sleep(600);
  await setLow(page, false);
  await reloadAfterConfig(page, sleep);
  // reload 之后可能落在根目录（没有网格），要重新点进目标目录
  if (!(await page.locator('app-gallery-grid-photo').count())) {
    await openDir(page);
  }
  await page.locator('app-gallery-grid-photo:not(:has(.video-indicator))').first().click();
  await sleep(2000);

  const w0 = await waitAllDone(page, 45000);
  chk('关底图：打开时窗口内每张都上屏', w0.stat.nFull >= 2 && w0.stat.allDone,
    'nFull=' + w0.stat.nFull + '/nItem=' + w0.stat.nItem + ' 等待=' + w0.ms + 'ms');
  await page.screenshot({path: path.join(OUT, 'b1-low-off.png')});

  // 甩动：这是以前必闪的地方
  const before2 = (await stat(page)).hd;
  await watch(page);
  await fling(page, 12, 120);
  await sleep(60);
  const mid = await stat(page);
  await page.screenshot({path: path.join(OUT, 'b2-mid-fling.png')});
  await sleep(1200);
  ev = await readEv(page);
  const after = await stat(page);
  chk('关底图：甩动中已上屏的 vf-full 一个都不被移除', ev.rm === 0, 'rm=' + ev.rm + ' add=' + ev.add);
  chk('关底图：甩动中已绑定 src 一次都不改', ev.src === 0, 'srcChange=' + ev.src + ' ' + JSON.stringify(ev.detail));
  const w2 = await waitAllDone(page, 45000);
  chk('关底图：停手后新窗口每张都上屏', w2.stat.nFull === w2.stat.nItem && w2.stat.allDone,
    'nFull=' + w2.stat.nFull + '/nItem=' + w2.stat.nItem + ' hd=' + w2.stat.hd + ' 等待=' + w2.ms + 'ms');

  // 滑回原位：URL 复用、不再回源
  await page.keyboard.press('Escape');
  await sleep(500);
  const netBefore = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter((e) => /\/2160$/.test(e.name) && (e.transferSize || 0) > 0)
    .map((e) => e.name));
  await page.locator('app-gallery-grid-photo:not(:has(.video-indicator))').first().click();
  await sleep(2500);
  const back = await waitAllDone(page, 30000);
  chk('关底图：重新打开仍是每张都上屏', back.stat.nFull === back.stat.nItem, 'nFull=' + back.stat.nFull + ' 等待=' + back.ms);
  const netAfter = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter((e) => /\/2160$/.test(e.name) && (e.transferSize || 0) > 0)
    .map((e) => e.name));
  const fresh = netAfter.filter((u) => netBefore.indexOf(u) < 0);
  chk('复看已看过的图：2160 不再回源', fresh.length === 0,
    '新增回源=' + fresh.length + ' ' + JSON.stringify(fresh.map((u) => u.split('/').slice(-2).join('/')).slice(0, 3)));
  await page.screenshot({path: path.join(OUT, 'b3-reopen.png')});

  // 恢复原配置（在现网跑时尤其重要）
  const rs = await restoreLow(page, sw.prev);
  console.log('INFO 恢复 lowEnabled=' + JSON.stringify(rs));
  console.log('SUMMARY ' + JSON.stringify({pass, fail}));
  await browser.close();
})();
