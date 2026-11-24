/* 清理后：①设置页还下发哪些 flow 字段 ②旧 config.json 里的残留字段会不会带进内存 */
const http = require('http');
const https = require('https');
const HOST = '192.168.0.10';
const PORT = Number(process.env.PORT || 8285);
const SECURE = process.env.SECURE === '1';

function req(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const lib = SECURE ? https : http;
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = lib.request({host: HOST, port: PORT, path, method,
      rejectUnauthorized: false,
      headers: Object.assign({'Accept': 'application/json'},
        data ? {'Content-Type': 'application/json', 'Content-Length': data.length} : {},
        cookie ? {'Cookie': cookie} : {})}, (res) => {
      let s = ''; res.setEncoding('utf8');
      res.on('data', (d) => s += d);
      res.on('end', () => resolve({code: res.statusCode, headers: res.headers, body: s}));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const login = await req('POST', '/pgapi/user/login',
    {loginCredential: {username: 'ffvz', password: 'z7850191'}});
  const cookie = (login.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
  console.log('登录 ' + login.code);
  const got = await req('GET', '/pgapi/settings', undefined, cookie);
  const raw = JSON.parse(got.body);
  const cfg = raw.result !== undefined ? raw.result : raw;
  const g = cfg.Gallery;
  const flow = Object.keys(g).filter((k) => k.toLowerCase().indexOf('flow') >= 0);
  console.log('GET /pgapi/settings ' + got.code + '  Gallery 字段数 ' + Object.keys(g).length);
  console.log('  下发的 flow 字段: ' + JSON.stringify(flow));
  const expect = ['flowLowEnabled', 'flowVoidColor'];
  const extra = flow.filter((k) => expect.indexOf(k) < 0);
  const missing = expect.filter((k) => flow.indexOf(k) < 0);
  console.log('  多余: ' + JSON.stringify(extra) + '   缺失: ' + JSON.stringify(missing));
  console.log(JSON.stringify({pass: extra.length === 0 && missing.length === 0}));
})();
