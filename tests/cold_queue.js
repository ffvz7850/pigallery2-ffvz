/**
 * 「不节流会怎样」的硬数字：清空服务端 2160 预览缓存后，
 * 同时砸 10 条冷生成（= 一次甩动窗口进出 10 张、如果不节流的样子），量排队结果。
 *
 * 用法： BASE=http://192.168.0.10:8282 N=10 node cold_queue.js
 */
const http = require('http');
const https = require('https');

const HOST = '192.168.0.10';
const BASE = process.env.BASE || 'http://192.168.0.10:8282';
const IS_TLS = BASE.startsWith('https');
const PORT = Number(BASE.split(':').pop());
const DIR = (process.env.DIR || '未压缩4/蠢沫沫 宴').split('/');
const N = Number(process.env.N || 10);
let COOKIE = '';

function req(path) {
  return new Promise((res, rej) => {
    const mod = IS_TLS ? https : http;
    const r = mod.request({host: HOST, port: PORT, path, method: 'GET', rejectUnauthorized: false,
      headers: {Cookie: COOKIE}}, (rs) => {
      let n = 0;
      rs.on('data', (d) => { n += d.length; });
      rs.on('end', () => res({code: rs.statusCode, bytes: n}));
    });
    r.on('error', rej);
    r.end();
  });
}

function login() {
  return new Promise((res, rej) => {
    const body = JSON.stringify({loginCredential: {username: 'ffvz', password: 'z7850191'}});
    const mod = IS_TLS ? https : http;
    const r = mod.request({host: HOST, port: PORT, path: '/pgapi/user/login', method: 'POST',
      rejectUnauthorized: false,
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)}}, (rs) => {
      COOKIE = (rs.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
      let s = '';
      rs.setEncoding('utf8');
      rs.on('data', (d) => { s += d; });
      rs.on('end', () => res(s));
    });
    r.on('error', rej); r.end(body);
  });
}

(async () => {
  await login();
  // 清预览缓存（真机实测是 GET，不是 DELETE）
  const clr = await req('/pgapi/gallery/preview-cache');
  console.log('清预览缓存:', clr.code);

  const body = await new Promise((res, rej) => {
    const mod = IS_TLS ? https : http;
    const r = mod.request({host: HOST, port: PORT,
      path: '/pgapi/gallery/content/' + encodeURI(DIR.join('/')),
      rejectUnauthorized: false, headers: {Cookie: COOKIE}}, (rs) => {
      let s = '';
      rs.setEncoding('utf8');
      rs.on('data', (d) => { s += d; });
      rs.on('end', () => res(s));
    });
    r.on('error', rej); r.end();
  });
  const media = JSON.parse(body).result.directory.media
    .filter((m) => !/\.(mp4|mov|mkv|webm|avi)$/i.test(m.n));
  const names = media.slice(0, N).map((m) => m.n);
  console.log('样本:', names.length, '张');

  const t0 = Date.now();
  const jobs = names.map((nm) => {
    const p = '/pgapi/gallery/content/' + encodeURI(DIR.join('/')) + '/' + encodeURIComponent(nm) + '/2160';
    const st = Date.now() - t0;
    return req(p).then((r) => ({nm, st, dur: Date.now() - t0 - st, code: r.code, kb: Math.round(r.bytes / 1024)}));
  });
  const out = await Promise.all(jobs);
  out.sort((a, b) => a.dur - b.dur);
  const wall = Date.now() - t0;
  const dur = out.map((x) => x.dur);
  const avg = Math.round(dur.reduce((a, b) => a + b, 0) / dur.length);
  console.log('\n完成顺序（按耗时）：');
  out.forEach((x, i) => console.log(String(i + 1).padStart(2), String(x.dur + 'ms').padStart(7),
    String(x.kb + 'KB').padStart(7), x.code, x.nm));
  console.log('\n总墙钟 %dms  首条 %dms  末条 %dms  均值 %dms', wall, dur[0], dur[dur.length - 1], avg);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
