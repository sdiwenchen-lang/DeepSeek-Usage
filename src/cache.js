/**
 * 内存缓存 + TTL + in-flight 去重。
 *
 * 满足 P1/P3：
 *   - 默认无后台轮询；数据只在「面板打开/手动刷新/月份切换」时按需拉取。
 *   - 同 key 并发请求合并为同一 Promise（in-flight 去重）。
 *   - 缓存 TTL 10 分钟，过期才拉新；手动刷新传 force=true 跳过。
 *
 * @module deepseek-usage/cache
 */

/**
 * @param {object} opts
 * @param {number} [opts.ttlMs=600000]
 * @param {() => number} [opts.now]  时钟注入（测试用）
 * @param {(force: boolean) => Promise<string>} [opts.scope]  当前账号的缓存命名空间
 */
export function createCache(opts = {}) {
  const ttlMs = opts.ttlMs ?? 600_000;
  const now = opts.now ?? (() => Date.now());

  /** @type {Map<string, { data: any, expiresAt: number }>} */
  const store = new Map();
  /** @type {Map<string, Promise<any>>} */
  const inflight = new Map();
  let generation = 0;
  const invalidated = () => Object.assign(new Error("cache-invalidated"), { code: "cache-invalidated" });

  /**
   * 读缓存；未命中或过期返回 undefined（不主动拉取）。
   */
  function get(key) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  /**
   * 读或拉取：命中直接返回；未命中调用 producer 并做 in-flight 去重。
   * @param {string} key
   * @param {() => Promise<any>} producer
   * @param {object} [o] { force?: boolean, ttlMs?: number }  每条可单独设 TTL（实时窗口用短 TTL）
   */
  async function getOrFetch(key, producer, o = {}) {
    const started = generation;
    if (opts.scope) key = `${await opts.scope(o.force === true)}:${key}`;
    if (started !== generation) throw invalidated();
    if (!o.force) {
      const cached = get(key);
      if (cached !== undefined) return cached;
    }
    const existing = inflight.get(key);
    if (existing) return existing;

    const p = Promise.resolve()
      .then(() => {
        if (inflight.get(key) !== p) throw invalidated();
        return producer();
      })
      .then(
        (data) => {
          if (inflight.get(key) !== p) {
            throw invalidated();
          }
          store.set(key, { data, expiresAt: now() + (o.ttlMs ?? ttlMs) });
          inflight.delete(key);
          return data;
        },
        (err) => {
          if (inflight.get(key) === p) inflight.delete(key);
          throw err;
        }
      );
    inflight.set(key, p);
    return p;
  }

  function set(key, data) {
    store.set(key, { data, expiresAt: now() + ttlMs });
  }

  function invalidate(key) {
    store.delete(key);
    inflight.delete(key);
  }

  function clear() {
    generation += 1;
    store.clear();
    inflight.clear();
  }

  /** 当前 in-flight 数量（测试与诊断用）。 */
  function size() {
    return { cached: store.size, inflight: inflight.size };
  }

  return { get, getOrFetch, set, invalidate, clear, size };
}