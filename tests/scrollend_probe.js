/**
 * 只测一件事：`.vf-scroll` 上原生 scrollend 事件是否可用、在甩动结束时是否只发一次。
 * 用途：判断能不能用 scrollend 取代 200ms 静默计时器来判定「停手」。
 */
const {chromium} = require('playwright-core');
const HOST = '192.168.0.10';
const BASE = process.env.BASE || 'http://192.168.0.10:8282';
const DIR = (process.env.DIR || '未压缩4/蠢沫沫 宴').split('/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true, args: ['--no-sandbox'],
  });
  const ctx = await browser.newContext({viewport: {width: 1280, height: 900}});
  const page = await ctx.newPage();
  await page.request.post(BASE + '/pgapi/user/login', {
    data: {loginCredential: {username: 'ffvz', password: 'z7850191'}},
  });
  await page.goto(BASE + '/gallery/', {waitUntil: 'domcontentloaded'});
  await sleep(2200);
  for (const want of DIR) {
    const dirs = page.locator('.directories a');
    const n = await dirs.count();
    for (let i = 0; i < n; i++) {
      const t = ((await dirs.nth(i).innerText()) || '').trim();
      if (t.indexOf(want) >= 0) { await dirs.nth(i).click(); break; }
    }
    await sleep(1800);
  }
  await page.locator('app-gallery-grid-photo:not(:has(.video-indicator))').first().click();
  await sleep(2500);

  const support = await page.evaluate(() => 'onscrollend' in window);
  console.log('浏览器支持 scrollend:', support);

  await page.evaluate(() => {
    window.__se = {events: [], scrolls: 0};
    const sc = document.querySelector('.vf-scroll');
    sc.addEventListener('scroll', () => { window.__se.scrolls++; }, {passive: true});
    sc.addEventListener('scrollend', () => { window.__se.events.push(Math.round(performance.now())); }, {passive: true});
    window.__probe = {t0: Math.round(performance.now())};
  });

  // 用真实滚轮甩一次（有惯性/多次事件，比脚本跳 scrollTop 更接近真人）
  const cx = 640, cy = 450;
  await page.mouse.move(cx, cy);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 320);
    await sleep(16);
  }
  await sleep(1200);
  const r1 = await page.evaluate(() => ({...window.__se, t0: window.__probe.t0}));
  console.log('滚轮 8 连击 → scroll 事件', r1.scrolls, '次，scrollend', r1.events.length, '次');

  // 再测一次「单次跳转」（键盘 PageDown 那种一次性滚动）
  await page.evaluate(() => { window.__se.events = []; window.__se.scrolls = 0; });
  await page.keyboard.press('PageDown');
  await sleep(900);
  const r2 = await page.evaluate(() => ({...window.__se}));
  console.log('PageDown → scroll', r2.scrolls, '次，scrollend', r2.events.length, '次');

  // 慢拖（每次 80px / 250ms，模拟慢速滚轮）
  await page.evaluate(() => { window.__se.events = []; window.__se.scrolls = 0; });
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 120);
    await sleep(250);
  }
  await sleep(700);
  const r3 = await page.evaluate(() => ({...window.__se}));
  console.log('慢速 4 次滚轮 → scroll', r3.scrolls, '次，scrollend', r3.events.length, '次');

  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
