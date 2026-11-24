/**
 * 切换「加载 720 底图」—— 走真实配置接口，不碰 localStorage。
 *
 * 1.3.23 把 localStorage 覆盖层删了（它只服务已删除的诊断面板，而且会造成
 * "设置里关了、这台设备还开着"的幽灵问题）。所以测试不能再靠注入 localStorage，
 * 必须像用户一样改配置。
 *
 * ⚠️ 这会真的改服务端 config.json：
 *   - 在测试容器 8286 上随便改
 *   - 在现网 8282 上改之前先拿 `prev`，测完务必 restoreLow()
 */
async function setLow(page, on) {
  return page.evaluate(async (val) => {
    const get = await (await fetch('/pgapi/settings', {cache: 'no-store'})).json();
    const cfg = get.result !== undefined ? get.result : get;
    const g = cfg.Gallery;
    if (!g) {
      return {ok: false, why: 'no Gallery in /pgapi/settings'};
    }
    const prev = g.flowLowEnabled;
    g.flowLowEnabled = val;
    const put = await fetch('/pgapi/settings', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({settings: g, settingsPath: 'Gallery'}),
    });
    return {ok: put.status === 200, status: put.status, prev};
  }, on);
}

async function restoreLow(page, prev) {
  if (prev === undefined || prev === null) {
    return {ok: true, skipped: true};
  }
  const r = await setLow(page, prev);
  return r;
}

/** 改完配置要刷新页面：客户端配置是在 index.html 里注入的，不刷新拿不到新值 */
async function reloadAfterConfig(page, sleep) {
  await page.reload({waitUntil: 'domcontentloaded'});
  await sleep(2200);
}

module.exports = {setLow, restoreLow, reloadAfterConfig};
