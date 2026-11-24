// piGallery2 前进/后退机制实测（竖图流档）
// 量每一层的 history.length / 是否换文档 / URL 落点 / 大图开关
// 用法：BASE=http://192.168.0.10:8282 node nav_bench.js
const {chromium} = require('playwright-core');

const BASE = process.env.BASE || 'http://192.168.0.10:8282';
const USER = process.env.PGUSER || 'ffvz';
const PASS = process.env.PGPASS || 'z7850191';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const steps = [];

async function waitOpen(page, want) {
  await page.waitForFunction(
    (w) => (window.__OPEN__ ? window.__OPEN__() : false) === w,
    want,
    {timeout: 20000}
  );
}

async function snap(page, label) {
  const s = await page.evaluate(() => ({
    href: decodeURIComponent(location.href.replace(location.origin, '')),
    hl: history.length,
    doc: window.__docId || 0,
    open: (window.__OPEN__ ? window.__OPEN__() : false),
    p: new URLSearchParams(location.search).get('p'),
  }));
  steps.push({label, ...s});
  console.log('  → ' + label + '  ok');
  return s;
}

// 点第一个匹配元素：等它出现 → 记录旧 URL → DOM click → 等 URL 真的变
async function clickFirst(page, sel) {
  await page.waitForFunction((s) => document.querySelectorAll(s).length > 0, sel, {timeout: 25000});
  const before = decodeURIComponent(page.url());
  await page.evaluate((s) => document.querySelector(s).click(), sel);
  await page.waitForFunction((u) => decodeURIComponent(location.href) !== u, before, {timeout: 25000});
}

async function back(page) {
  await page.evaluate(() => history.back());
  await sleep(1800);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  const ctx = await browser.newContext({
    viewport: {width: 412, height: 900},
    hasTouch: true,
    isMobile: true,
  });
  await ctx.addInitScript(() => {
    window.__docId = (+sessionStorage.getItem('__d') || 0) + 1;
    sessionStorage.setItem('__d', String(window.__docId));
    window.__OPEN__ = () => {
      const flow = document.querySelector('.vf-root');
      const lb = document.querySelector('app-lightbox .lightbox');
      return !!(flow || (lb && lb.offsetParent !== null));
    };
  });

  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 140)));

  await page.request.post(BASE + '/pgapi/user/login', {
    data: {loginCredential: {username: USER, password: PASS}},
  });

  console.log('① 启动');
  await page.goto(BASE + '/gallery/', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('app-gallery-directory a.btn', {timeout: 30000});
  await sleep(700);
  await snap(page, '① 启动 /gallery/');

  console.log('② 进第 1 层');
  await clickFirst(page, 'app-gallery-directory a.btn');
  await sleep(2200);
  await snap(page, '② 进第 1 层目录');

  console.log('③ 进第 2 层');
  await clickFirst(page, 'app-gallery-directory a.btn');
  await page.waitForFunction(() => document.querySelectorAll('app-gallery-grid-photo').length > 0, null, {timeout: 25000});
  await sleep(1800);
  await snap(page, '③ 进第 2 层（有照片）');

  console.log('④ 打开大图');
  await clickFirst(page, 'app-gallery-grid-photo');
  await waitOpen(page, true);
  await sleep(1200);
  await snap(page, '④ 打开大图');

  console.log('⑤ 大图内下滑两屏');
  await page.mouse.move(206, 600);
  await page.mouse.wheel(0, 1400);
  await sleep(1200);
  await page.mouse.wheel(0, 1400);
  await sleep(1800);
  await snap(page, '⑤ 大图内下滑两屏');

  console.log('⑥⑦⑧ 连续返回三次');
  await back(page);
  await snap(page, '⑥ 返回#1');
  await back(page);
  await snap(page, '⑦ 返回#2');
  await back(page);
  await snap(page, '⑧ 返回#3');

  // 回到有照片的那层，测「主动关闭」路径
  console.log('⑨ 重新进两层');
  await clickFirst(page, 'app-gallery-directory a.btn');
  await sleep(2200);
  await clickFirst(page, 'app-gallery-directory a.btn');
  await page.waitForFunction(() => document.querySelectorAll('app-gallery-grid-photo').length > 0, null, {timeout: 25000});
  await sleep(1500);
  await snap(page, '⑨ 重新进到有照片的层');

  console.log('⑩ 打开大图后按 Esc 主动关闭');
  await clickFirst(page, 'app-gallery-grid-photo');
  await waitOpen(page, true);
  await sleep(900);
  await snap(page, '⑩ 打开大图');
  await page.keyboard.press('Escape');
  await waitOpen(page, false);
  await sleep(1200);
  await snap(page, '⑪ Esc 主动关闭');
  await back(page);
  await snap(page, '⑫ 主动关闭后再返回');

  // 面包屑向上
  const hasUp = await page.evaluate(
    () => [...document.querySelectorAll('app-gallery-navigator a')].filter((a) => a.getAttribute('href')).length > 0
  );
  if (hasUp) {
    console.log('⑬ 面包屑向上 + 再返回');
    await page.evaluate(() => {
      const a = [...document.querySelectorAll('app-gallery-navigator a')].filter((x) => x.getAttribute('href')).pop();
      a.click();
    });
    await sleep(2200);
    await snap(page, '⑬ 面包屑向上');
    await back(page);
    await snap(page, '⑭ 面包屑向上后再返回');
  } else {
    console.log('（没找到面包屑链接，跳过 ⑬⑭）');
  }

  const header = ['步骤', 'history', '文档', '大图', 'p', 'URL'];
  const rows = steps.map((s) => [s.label, s.hl, s.doc, s.open ? '开' : '关', s.p || '-', s.href]);
  const w = header.map((h, i) => Math.max(h.length * 2, ...rows.map((r) => String(r[i]).length)));
  const pad = (v, i) => {
    const str = String(v);
    const visual = [...str].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1), 0);
    return str + ' '.repeat(Math.max(0, w[i] - visual));
  };
  console.log('\n' + header.map(pad).join(' | '));
  console.log(w.map((x) => '-'.repeat(x)).join('-+-'));
  rows.forEach((r) => console.log(r.map(pad).join(' | ')));

  console.log('\n--- 逐项判定 ---');
  for (let i = 1; i < steps.length; i++) {
    const a = steps[i - 1], b = steps[i];
    console.log(
      `${b.label}: history ${b.hl - a.hl >= 0 ? '+' + (b.hl - a.hl) : b.hl - a.hl}` +
      `，${b.doc !== a.doc ? '换文档(#' + b.doc + ')' : '同一文档'}` +
      `，大图 ${a.open ? '开' : '关'}→${b.open ? '开' : '关'}`
    );
  }

  await browser.close();
})().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
