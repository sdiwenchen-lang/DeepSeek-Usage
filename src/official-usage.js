/**
 * Daily official-bill usage for the budget guard.
 *
 * The official dashboard uses the same by-api-key range endpoints as the
 * official view. This module only needs the current Beijing day's totals, so
 * it fetches the two range series directly instead of rebuilding the full
 * monthly payload. Results are cached briefly: the budget guard runs before
 * every model call, and we must not hit the upstream API on each step.
 */

export const OFFICIAL_BUDGET_TZ = 28_800;
const DAY_MS = 86_400_000;
const CACHE_MS = 30_000;

export function officialDayWindow(now = Date.now(), tz = OFFICIAL_BUDGET_TZ) {
  const start = Math.floor((now + tz * 1000) / DAY_MS) * DAY_MS - tz * 1000;
  return { start: Math.floor(start / 1000), end: Math.floor((start + DAY_MS) / 1000) };
}

export function createOfficialUsage({ account, api, cache, now = Date.now, tz = OFFICIAL_BUDGET_TZ, logger } = {}) {
  if (!account || !api) throw new Error("official-usage: account and api are required");

  async function load(force) {
    const token = await account.getToken(force).catch(() => undefined);
    if (!token) return { available: false, error: "unauthenticated", tokens: null, cost: null };
    try {
      const window = officialDayWindow(now(), tz);
      const [amount, cost] = await Promise.all([
        api.fetchRangeAmount(token, { ...window, tz }),
        api.fetchRangeCost(token, { ...window, tz }),
      ]);
      const tokens = (amount?.rows ?? []).reduce((sum, row) => sum + (row.hit || 0) + (row.miss || 0) + (row.output || 0), 0);
      const cny = (cost?.rows ?? []).reduce((sum, row) => sum + (row.cost || 0), 0);
      return { available: true, tokens, cost: cny, complete: true, window };
    } catch (error) {
      if (error?.status === 401) {
        account.invalidate?.();
        return { available: false, error: "unauthenticated", tokens: null, cost: null };
      }
      logger?.warn?.("deepseek-usage: official budget usage failed: %s", error?.message ?? error);
      return { available: false, error: error?.code ?? "official-query-failed", tokens: null, cost: null };
    }
  }

  async function usage({ force = false } = {}) {
    if (!cache?.getOrFetch) return load(force);
    const window = officialDayWindow(now(), tz);
    return cache.getOrFetch(`official:budget:${window.start}:${window.end}`, () => load(force), { force, ttlMs: CACHE_MS });
  }

  return { usage };
}
