/** Offline real-React fixture. Run: node scripts/preview-interactive.mjs */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
import { createPricing } from '../src/pricing.js';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const pricing = createPricing({ usdToCny: 6.7 });
const prices = { ok: true, ...pricing.meta(), models: pricing.tables(), names: pricing.names(), fixture: true };
assert(Object.keys(prices.models).length >= 40);
const runtimeRoot = 'node_modules/';
if (!existsSync(runtimeRoot + 'react/umd/react.production.min.js')) {
  console.error('需要先安装开发依赖：npm install');
  process.exit(1);
}
const runtimes = ['react', 'react-dom'].map((p) => read(runtimeRoot + p + '/umd/' + p + '.production.min.js'));
const client = read('src/client.js');
function boot(pricing) {
  const RealDate = window.Date, offset = 8 * 3600000, now = RealDate.parse('2026-10-28T12:00:00+08:00');
  const shifted = (d) => new RealDate(d.getTime() + offset);
  class FixtureDate extends RealDate {
    constructor(...args) { super(...(args.length === 0 ? [now] : args.length > 1 ? [RealDate.UTC(...args) - offset] : args)); }
    static now() { return now; }
    getTimezoneOffset() { return -480; }
  }
  for (const name of ['FullYear', 'Month', 'Date', 'Day', 'Hours', 'Minutes', 'Seconds', 'Milliseconds']) {
    FixtureDate.prototype['get' + name] = function () { return shifted(this)['getUTC' + name](); };
    if (name !== 'Day') FixtureDate.prototype['set' + name] = function (...args) { const d = shifted(this); d['setUTC' + name](...args); return this.setTime(d.getTime() - offset); };
  }
  for (const name of ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString']) {
    FixtureDate.prototype[name] = function (locale, options) { return RealDate.prototype[name].call(this, locale, { timeZone: 'Asia/Shanghai', ...options }); };
  }
  window.Date = FixtureDate;
  window.__fixture = { fixture: true, label: '测试夹具 / MOCK DATA', now: '2026-10-28T12:00:00+08:00', timeZone: 'Asia/Shanghai', pricingSource: pricing.snapshot, ready: false };
  window.__requests = []; window.__errors = [];
  if (new URLSearchParams(location.search).has('debug')) setTimeout(() => { const pre = document.createElement('pre'); pre.id = 'fixture-debug'; pre.textContent = JSON.stringify({ fixture: window.__fixture, errors: window.__errors, requests: window.__requests.map(({ path, status }) => ({ path, status })) }, null, 2); document.body.appendChild(pre); }, 1500);
  addEventListener('error', (e) => window.__errors.push(e.message + (e.error?.stack ? '\\n' + e.error.stack : '')));
  addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const add = (s, n) => { const d = new FixtureDate(s + 'T12:00:00+08:00'); d.setDate(d.getDate() + n); return iso(d); };
  const today = '2026-10-28';
  const sum = (rows) => {
    const out = {}; for (const k of ['hit', 'miss', 'cacheWrite', 'output', 'tokens', 'requests', 'cost', 'usd', 'pricedTokens', 'unpricedTokens']) out[k] = rows.reduce((n, r) => n + (r[k] || 0), 0);
    return { ...out, costComplete: true };
  };
  function windowOf(q) {
    if (q.has('from') && q.has('to')) return [q.get('from'), q.get('to')];
    const range = q.get('range') || 'today';
    if (range === 'yesterday') return [add(today, -1), add(today, -1)];
    if (range === 'last7') return [add(today, -6), today];
    if (range === 'last30') return [add(today, -29), today];
    if (range === 'thisMonth') return ['2026-10-01', today];
    if (range === 'lastMonth') return ['2026-09-01', '2026-09-30'];
    return [today, today];
  }
  function usage(q, local) {
    const [from, to] = windowOf(q), days = [];
    let custom = {}; try { custom = JSON.parse(q.get('rates') || '{}'); } catch {}
    const rates = { ...pricing.models, ...(custom.models || {}) }, fx = custom.usdToCny === undefined ? pricing.usdToCny : custom.usdToCny;
    for (let date = from, i = 0; date <= to && date <= today && i < 370; date = add(date, 1), i++) {
      const seed = Number(date.split('-').join(''));
      const names = local ? ['deepseek-chat', 'deepseek-reasoner', 'claude-sonnet-5-5'] : ['deepseek-chat', 'deepseek-reasoner'];
      const models = names.map((model, j) => {
        const scale = local ? 0.87 : 1;
        const hit = Math.round((240000 + seed % 97000 + j * 22000) * scale), miss = Math.round((97000 + seed % 47000) * scale), output = Math.round((71000 + seed % 33000) * scale), cacheWrite = local && j === 2 ? 18000 : 0;
        const tokens = hit + miss + output + cacheWrite, r = rates[model];
        const usd = (hit * r.cacheRead + miss * r.input + output * r.output + cacheWrite * r.cacheWrite) / 1e6;
        return { model, hit, miss, output, cacheWrite, tokens, requests: 60 + seed % 80 + j * 20, usd, cost: fx > 0 ? usd * fx : null, pricedTokens: tokens, unpricedTokens: 0, costComplete: true };
      });
      days.push({ date, key: date, label: date, ...sum(models), models });
    }
    let points = days, granularity = 'day';
    if (from === to && days.length) {
      granularity = 'hour'; const count = from === today ? 13 : 24;
      points = Array.from({ length: count }, (_, hour) => {
        const models = days[0].models.map((m) => { const out = { ...m }; for (const k of ['hit', 'miss', 'output', 'cacheWrite', 'tokens', 'requests', 'usd', 'cost', 'pricedTokens']) out[k] = m[k] / count; return out; });
        return { key: from + 'T' + pad(hour), date: from, label: pad(hour) + ':00', hour, models, ...sum(models) };
      });
    }
    return { ok: true, fixture: true, source: local ? 'local' : 'official', range: q.get('range') || 'custom', granularity, days, points, total: sum(days), window: { from, to, tz: 28800 }, balance: { total: 3108.05, consumedTotal: 12873.44 }, pricing, cache: {}, available: true, sources: [{ source: '测试夹具', available: true }], caveats: ['测试夹具：模拟用量，不代表真实账户数据。'] };
  }
  window.fetch = async function (input, init = {}) {
    const raw = typeof input === 'string' ? input : input.url, u = new URL(raw, 'https://fixture.invalid');
    const req = { url: raw, path: u.pathname, method: init.method || 'GET', query: Object.fromEntries(u.searchParams), at: FixtureDate.now() };
    window.__requests.push(req);
    let payload, status = 200; const q = u.searchParams;
    if (u.origin !== 'https://fixture.invalid') { status = 403; payload = { ok: false, error: 'external-network-disabled', fixture: true }; }
    else if (u.pathname === '/api/deepseek-usage/pricing') payload = pricing;
    else if (u.pathname === '/api/deepseek-usage/status') payload = { ok: true, fixture: true, authenticated: true, account: { available: true, email: 'fixture@example.invalid' }, local: { available: true, sources: ['测试夹具'] }, official: { available: true } };
    else if (u.pathname === '/api/deepseek-usage/local') payload = usage(q, true);
    else if (u.pathname === '/api/deepseek-usage/official') payload = usage(q, false);
    else if (u.pathname === '/api/deepseek-usage/summary') {
      const year = Number(q.get('year') || 2026), month = Number(q.get('month') || 10);
      q.set('from', year + '-' + pad(month) + '-01'); q.set('to', iso(new FixtureDate(year, month, 0))); payload = usage(q, false);
    } else if (u.pathname === '/api/deepseek-usage/reconcile') {
      const a = usage(q, false), b = usage(q, true);
      const points = a.points.map((p, i) => { const tokens = Math.round(p.tokens * 0.87); return { key: p.key, date: p.date, official: { tokens: p.tokens }, local: { tokens }, deltaTokens: p.tokens - tokens, coverage: 0.87 }; });
      payload = { ok: true, fixture: true, official: { available: true, tokens: a.total.tokens }, local: { available: true, tokens: Math.round(a.total.tokens * 0.87) }, delta: { tokens: Math.round(a.total.tokens * 0.13) }, coverage: 0.87, points, caveats: ['测试夹具：本地 DeepSeek 覆盖率固定 87%。'] };
    } else { status = 404; payload = { ok: false, error: 'unmocked-path', fixture: true }; }
    req.status = status; req.response = payload;
    return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
  };
  const jsx = (type, props, key) => React.createElement(type, key === undefined ? props : { ...props, key });
  window.__ModuleLoader__ = { load(entry) {
    const exports = entry.factory((id) => { if (id === 'react') return React; if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: React.Fragment }; throw new Error('Unmocked module: ' + id); });
    window.__clientExports = exports;
    exports.apply({ slots: { inject: (_, register) => register(), register: (_, Seat) => {
      window.__Seat = Seat; ReactDOM.createRoot(document.getElementById('fixture-root')).render(React.createElement(Seat, { wide: true }));
      let attempts = 0; const open = () => { const button = document.querySelector('.d-seat'); if (button) { button.click(); window.__fixture.ready = true; } else if (++attempts < 100) setTimeout(open, 10); else window.__fixture.mountError = 'Seat not rendered after 1s'; }; open();
    } } });
  } };
}
const script = (s) => '<script>' + s.replace(/<\/script/gi, '<\\/script') + '</script>';
const setup = '(' + boot.toString() + ')(' + JSON.stringify(prices) + ');';
for (const code of [...runtimes, setup, client]) new Script(code);
const html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src none; script-src &apos;unsafe-inline&apos;; style-src &apos;unsafe-inline&apos;; img-src data: blob:; connect-src none"><title>DeepSeek Usage · 测试夹具</title><style>body{margin:0;background:#eef1f6;font-family:sans-serif}#fixture-banner{padding:12px 20px;color:#835000;background:#fff1ce}#fixture-root{width:290px;margin:20px}</style><style id="deepseek-usage-styles">' + read('src/panel.css') + '</style></head><body><div id="fixture-banner">测试夹具 / MOCK DATA · 2026-10-28 12:00 Asia/Shanghai · 完全离线 · window.__requests 可检查请求</div><main id="fixture-root"></main>' + runtimes.map(script).join('') + script(setup) + script(client) + '</body></html>';
const output = join(root, 'output/playwright/interactive.html');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
console.log('Generated: ' + output);
console.log('Open: file://' + output);
console.log('React 18.2.0 + ReactDOM 18.2.0; ' + Object.keys(prices.models).length + ' real pricing models.');
