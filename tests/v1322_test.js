/**
 * 1.3.22 验证：预热与「加载 720 底图」解耦
 *
 * 要证明三件事：
 *   A. 关掉 720 底图时，预热**真的发出去了**（1.3.21 及以前是一条都不发）
 *   B. 预热的 URL **不与挂载窗口内正在加载的 URL 重叠**（否则服务端会对同一张图跑两遍 sharp）
 *   C. 预热过的那张，滑过去时**确实命中内存**（第二次请求变快，不是又生成 2.5s）
 *   D. 开底图模式下预热行为不变（回归）
 *
 * 用法：
 *   LOW=0 node v1322_test.js     # 无底图（现网配置）
 *   LOW=1 node v1322_test.js     # 有底图（回归）
 */
const {chromium} = require('playwright-core');
const {setLow, restoreLow, reloadAfterConfig} = require('./low_switch');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE = process.env.BASE || 'https://192.168.0.10:8286';
const DIR = (process.env.DIR || '未压缩4/蠢沫沫 宴').split('/');
const LOW = process.env.LOW === '1';
const PG = Number(process.env.PG || 2);
const MA = Number(process.env.MA || 2);
const OUT = path.join(__dirname, 'shots', 'v1322');
fs.mkdirSync(OUT, {recursive: true});

let pass = 0, fail = 0;
const chk = (n, ok, d) => {
  if (ok) { pass++; console.log('PASS ' + n + (d ? '  ' + d : '')); }
  else { fail++; console.log('FAIL ' + n + '  ' + (d || '')); }
};
const med = (a) => {
  if (!a.length) { return -1; }
  const s = a.slice().sort((x, y) => x - y);
  return s[s.length >> 1];
};

/** 当前屏中心那张的 vf-full src + 挂载窗口里所有 2160 URL */
const stat = (page) => page.evaluate(() => {
  const items = [...document.querySelectorAll('.vf-item')];
  const fulls = [...document.querySelectorAll('img.vf-full')];
  const sc = document.querySelector('.vf-scroll');
  const r0 = sc.getBoundingClientRect();
  const cy = r0.top + r0.height / 2;
  const curEl = items.find((e) => {
    const r = e.getBoundingClientRect();
    return r.top <= cy && r.bottom >= cy;
  });
  const src = (el) => (el ? el.getAttribute('src') || '' : '');
  return {
    nItem: items.length,
    nFull: fulls.length,
    curSrc: src(curEl && curEl.querySelector('img.vf-full')),
    hdUrls: [...new Set(fulls.map(src).filter((u) => u.endsWith('2160')))],
    allDone: fulls.length > 0 && fulls.every((f) => f.complete && f.naturalWidth > 0),
  };
});

async function enterLightbox(page, lowOn) {
  await page.goto(BASE + '/', {waitUntil: 'domcontentloaded'});
  await sleep(1200);
  if (await page.locator('#username').count()) {
    await page.fill('#username', 'ffvz');
    await page.fill('#password', 'z7850191');
    await page.keyboard.press('Enter');
    await sleep(2800);
  }
  let prev;
  if (lowOn !== undefined) {
    const sw = await setLow(page, lowOn);
    prev = sw.prev;
    console.log('INFO 设 lowEnabled=' + lowOn + ' ' + JSON.stringify(sw));
    await reloadAfterConfig(page, sleep);
  }
  await page.goto(BASE + '/gallery/', {waitUntil: 'domcontentloaded'});
  await sleep(2400);
  for (const want of DIR) {
    const dirs = page.locator('.directories a');
    const n = await dirs.count();
    let hit = false;
    for (let i = 0; i < n; i++) {
      const t = ((await dirs.nth(i).innerText()) || '').trim();
      if (t.indexOf(want) >= 0) { await dirs.nth(i).click(); await sleep(2300); hit = true; break; }
    }
    if (!hit) { console.log('WARN 目录没找到: ' + want); }
  }
  await page.locator('app-gallery-grid-photo:not(:has(.video-indicator))').first().click();
  await sleep(2500);
  return prev;
}

(async () => {
  const b = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true, args: ['--no-sandbox'],
  });
  const ctx = await b.newContext({viewport: {width: 1280, height: 900}, ignoreHTTPSErrors: true});
  await ctx.addCookies([{name: 'pigallery2-lang', value: 'zh', domain: '192.168.0.10', path: '/'}]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);

  // 预热请求（带 X-Pg2-Pregen: 1）与全部 2160 请求都记下来
  const pregens = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!/\/2160$/.test(u)) { return; }
    const h = r.headers();
    if (h['x-pg2-pregen'] === '1') { pregens.push({u, t: Date.now()}); }
  });

  console.log('=== 配置：lowEnabled=' + LOW + '（preGenCount / mountAhead 已固化成常量，不再可注入）===');
  const prevLow = await enterLightbox(page, LOW);
  // 预热是串行 1 路、单张冷生成 ~2.5s，给足时间跑完 2 张
  await sleep(9000);

  const s1 = await stat(page);
  console.log('INFO 打开后：nItem=' + s1.nItem + ' nFull=' + s1.nFull + ' 窗口内2160=' + s1.hdUrls.length +
    ' 预热请求=' + pregens.length);

  // ---------- A. 解耦是否生效 ----------
  chk('预热请求真的发出去了（解耦生效）', pregens.length >= 1,
    'pregen=' + pregens.length + '  ' + JSON.stringify(pregens.map((x) => x.u.split('/').pop())));

  // ---------- B. 不与挂载窗口重叠 ----------
  const preSet = new Set(pregens.map((x) => x.u));
  const overlap = s1.hdUrls.filter((u) => preSet.has(u));
  if (LOW) {
    // 有底图时老行为不变：窗口内非当前张不取高清档，所以预热从锚点起，允许重叠
    chk('有底图：预热从锚点起（老行为，允许与窗口重叠）', pregens.length >= 1,
      'pregen=' + pregens.length + ' 重叠=' + overlap.length);
  } else {
    chk('无底图：预热 URL 与窗口内正在加载的 URL 不重叠', overlap.length === 0,
      '重叠=' + overlap.length + ' ' + JSON.stringify(overlap.map((u) => u.split('/').pop())));
  }

  // ---------- C. 滑到预热过的那张，是否命中 ----------
  const before = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter((e) => /\/2160$/.test(e.name))
    .map((e) => ({u: e.name, d: Math.round(e.duration)})));

  // 往后滚 3 屏（预热起点 = current + 1 + mountAhead）
  const t0 = Date.now();
  await page.evaluate((steps) => {
    const s = document.querySelector('.vf-scroll');
    for (let i = 0; i < steps; i++) { s.scrollTop += s.clientHeight; }
    s.dispatchEvent(new Event('scroll'));
  }, 3);
  let ready = -1;
  for (let i = 0; i < 120; i++) {
    await sleep(50);
    const x = await stat(page);
    if (x.curSrc && x.curSrc.endsWith('2160') && x.allDone) { ready = Date.now() - t0; break; }
  }
  await sleep(1500);
  const s2 = await stat(page);
  chk('滚 3 屏后当前张已清晰', ready >= 0 && s2.curSrc.endsWith('2160'), '等待=' + ready + 'ms');

  // 同一 URL 的第二条 Resource Timing 是否明显变小（= 服务端命中内存）
  const after = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter((e) => /\/2160$/.test(e.name))
    .map((e) => ({u: e.name, d: Math.round(e.duration)})));
  const byUrl = {};
  after.forEach((e) => { (byUrl[e.u] = byUrl[e.u] || []).push(e.d); });
  const dupUrls = Object.keys(byUrl).filter((u) => byUrl[u].length >= 2);
  const secondFast = dupUrls.filter((u) => Math.min(...byUrl[u]) < 600);
  console.log('INFO 有重复请求的 2160 URL: ' + dupUrls.length + '  其中含命中(<600ms)的: ' + secondFast.length);
  if (!LOW && dupUrls.length) {
    chk('预热过的图被第二次请求时命中内存（<600ms）', secondFast.length >= 1,
      '样本=' + JSON.stringify(dupUrls.slice(0, 3).map((u) => byUrl[u])));
  }
  console.log('INFO 2160 请求耗时全样本: ' + JSON.stringify(after.map((e) => e.d).sort((x, y) => x - y)));

  await page.screenshot({path: path.join(OUT, (LOW ? 'low-on' : 'low-off') + '-after-scroll.png')});
  if (prevLow !== undefined) {
    console.log('INFO 恢复 lowEnabled=' + JSON.stringify(await restoreLow(page, prevLow)));
  }
  console.log('SUMMARY ' + JSON.stringify({pass, fail}));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
