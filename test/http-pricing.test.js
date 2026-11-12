import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createBudget } from "../src/budget.js";
import { createPricing } from "../src/pricing.js";
import { LOCAL_PATH, registerRoutes } from "../src/http.js";

const savedRates = { schema: 2, usdToCny: 8.5, models: { "deepseek-flash": { input: 9, output: 8, cacheRead: 0, cacheWrite: 0 } }, hidden: ["kimi-k3"] };
test("local HTTP queries without browser prices use saved host prices after restart", async () => {
  const queries = [];
  const budget = createBudget({ initial: { rates: savedRates } });
  const routes = new Map();
  const server = { register(route) { routes.set(route.path, route.handler); return () => {}; } };
  registerRoutes({ get: name => name === "webServer" ? server : undefined, effect: fn => fn() }, {
    budget,
    local: { async query(options) {
      queries.push(options);
      return { cost: createPricing(options.rates).quote("deepseek-flash", { miss: 1e6 }).cost };
    } },
  });
  async function get(rates) {
    const req = Readable.from([]);
    Object.assign(req, { method: "GET", url: LOCAL_PATH + "?range=today&tz=28800" + (rates ? "&rates=" + encodeURIComponent(JSON.stringify(rates)) : ""), socket: { remoteAddress: "127.0.0.1" }, headers: { host: "127.0.0.1" } });
    let status, data;
    await routes.get(LOCAL_PATH)(req, { writeHead(code) { status = code; }, end(body) { data = JSON.parse(body); } });
    assert.equal(status, 200);
    return data;
  }
  assert.equal((await get()).cost, 76.5);
  assert.deepEqual(queries[0].rates.models["deepseek-flash"], savedRates.models["deepseek-flash"]);
  assert.deepEqual(queries[0].rates.hidden, ["kimi-k3"]);
  assert.equal((await get({ ...savedRates, usdToCny: 2 })).cost, 18);
  assert.equal((await get()).cost, 76.5);
});
