// 边界：根层按返回是否直接离开应用；前进是否重开大图
const {chromium} = require('playwright-core');
const BASE = process.env.BASE || 'http://192.168.0.10:8282';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({executablePath: 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true, args: ['--no-sandbox']});
  const ctx = await b.newContext({viewport: {width: 412, height: 900}, hasTouch: true, isMobile: true});
  await ctx.addInitScript(() => { window.__docId = (+sessionStorage.getItem('__d') || 0) + 1; sessionStorage.setItem('__d', String(window.__docId)); });
  const p = await ctx.newPage();
  await p.request.post(BASE + '/pgapi/user/login', {data: {loginCredential: {username: 'ffvz', password: 'z7850191'}}});
  await p.goto(BASE + '/gallery/', {waitUntil: 'domcontentloaded'});
  await p.waitForSelector('app-gallery-directory a.btn', {timeout: 30000});
  await sleep(800);
  console.log('root: hl=%d doc=%d url=%s', await p.evaluate(() => history.length), await p.evaluate(() => window.__docId), decodeURIComponent(p.url()));

  // 根层返回
  await p.evaluate(() => history.back()).catch(() => {});
  await sleep(2500);
  let alive = '已离开应用(文档被卸载)';
  try { alive = await p.evaluate(() => '仍在应用内 doc#' + window.__docId); } catch (e) { /* 上下文已销毁 */ }
  console.log('back@root -> url=%s  %s', p.url().slice(0, 60), alive);

  // 前进回去，然后测 打开大图 → 返回关掉 → 前进是否重开
  if (!p.url().includes('/gallery') || true) {
    await p.goto(BASE + '/gallery/', {waitUntil: 'domcontentloaded'});
    await p.waitForSelector('app-gallery-directory a.btn', {timeout: 30000});
  }
  await p.evaluate(() => document.querySelector('app-gallery-directory a.btn').click());
  await sleep(2200);
  await p.evaluate(() => document.querySelector('app-gallery-directory a.btn').click());
  await p.waitForFunction(() => document.querySelectorAll('app-gallery-grid-photo').length > 0, null, {timeout: 25000});
  await sleep(1500);
  const before = await p.evaluate(() => history.length);
  await p.evaluate(() => document.querySelector('app-gallery-grid-photo').click());
  await sleep(1500);
  const opened = await p.evaluate(() => ({hl: history.length, p: new URLSearchParams(location.search).get('p'), open: !!document.querySelector('.vf-root')}));
  await p.evaluate(() => history.back());
  await sleep(1600);
  const closed = await p.evaluate(() => ({hl: history.length, p: new URLSearchParams(location.search).get('p'), open: !!document.querySelector('.vf-root')}));
  await p.evaluate(() => history.forward());
  await sleep(1800);
  const fwd = await p.evaluate(() => ({hl: history.length, p: new URLSearchParams(location.search).get('p'), open: !!document.querySelector('.vf-root')}));
  console.log('开图: hl %d->%d p=%s open=%s', before, opened.hl, opened.p, opened.open);
  console.log('返回: hl=%d p=%s open=%s', closed.hl, closed.p, closed.open);
  console.log('前进: hl=%d p=%s open=%s', fwd.hl, fwd.p, fwd.open);
  await b.close();
})();
