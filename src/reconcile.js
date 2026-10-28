/**
 * 官方账单与本地会话日志的对账。
 *
 * 两边口径不同，不能强行相等：
 *
 * - 官方：账户全量、按平台出账、最多延迟约 5 分钟，包含其他客户端/机器。
 * - 本地：本机 DSH 会话、实时，包含中转/API Key 路由，但不含已被清理的日志。
 *
 * 所以这里只做「对齐 + 覆盖率 + 差额」，并把差异原因写进 caveats，
 * 不把本地数字伪装成官方数字。
 *
 * @module deepseek-usage/reconcile
 */

function tokensOf(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value.tokens === "number") return value.tokens;
  if (value.tokens !== null && typeof value.tokens === "object") {
    if (typeof value.tokens.total === "number") return value.tokens.total;
  }
  return (value.hit ?? 0) + (value.miss ?? 0) + (value.output ?? 0);
}

function moneyOf(payload, points) {
  for (const field of ["cost", "spent"]) {
    if (Object.hasOwn(payload, field)) return typeof payload[field] === "number" && Number.isFinite(payload[field]) ? payload[field] : null;
  }
  if (points.some((point) => point.cost === null)) return null;
  return points.reduce((sum, point) => sum + (point.cost ?? 0), 0);
}

function summaryOf(payload, available) {
  if (!available || payload === null || payload === undefined) {
    return {
      available: false,
      tokens: 0,
      hit: 0,
      miss: 0,
      output: 0,
      requests: 0,
      cost: null,
      currency: null,
      estimated: false,
      costMeta: null,
      coverage: null,
    };
  }
  const tokens = payload.tokens ?? {};
  const points = Array.isArray(payload.points) ? payload.points : [];
  const sum = (field) => points.reduce((total, point) => total + (point[field] ?? 0), 0);
  return {
    available: true,
    tokens: typeof tokens.total === "number" ? tokens.total : tokensOf(payload),
    hit: typeof tokens.hit === "number" ? tokens.hit : sum("hit"),
    miss: typeof tokens.miss === "number" ? tokens.miss : sum("miss"),
    output: typeof tokens.output === "number" ? tokens.output : sum("output"),
    requests: typeof payload.requests === "number" ? payload.requests : sum("requests"),
    cost: moneyOf(payload, points),
    currency: payload.currency ?? (payload.source === "local" || payload.costMeta ? "CNY" : payload.balance?.currency ?? "CNY"),
    estimated: payload.costMeta?.estimated === true,
    costMeta: payload.costMeta ?? null,
    coverage: payload.coverage ?? null,
  };
}

function keyOf(point) {
  return point?.key ?? point?.date ?? "";
}

function pointOfOfficial(point) {
  return {
    tokens: tokensOf(point),
    requests: point?.requests ?? 0,
    cost: point && Object.hasOwn(point, "cost") ? point.cost : 0,
  };
}

function pointOfLocal(point) {
  return {
    tokens: tokensOf(point),
    requests: point?.requests ?? 0,
    cost: point && Object.hasOwn(point, "cost") ? point.cost : null,
    pricedTokens: point?.pricedTokens ?? 0,
    unpricedTokens: point?.unpricedTokens ?? 0,
  };
}

function ratio(local, official) {
  if (!official || official <= 0) return null;
  return Math.round((local / official) * 10000) / 10000;
}

/**
 * @param {{
 *   official?: object | null,
 *   local?: object | null,
 *   officialError?: string | null,
 *   range?: string,
 *   now?: number
 * }} deps
 */
export function buildReconcilePayload(deps = {}) {
  const officialAvailable = deps.official !== null && deps.official !== undefined;
  const localAvailable = deps.local !== null && deps.local !== undefined;
  const official = summaryOf(deps.official, officialAvailable);
  const local = summaryOf(deps.local, localAvailable);

  const officialPoints = new Map();
  for (const point of deps.official?.points ?? []) {
    officialPoints.set(keyOf(point), point);
  }
  const localPoints = new Map();
  for (const point of deps.local?.points ?? []) {
    localPoints.set(keyOf(point), point);
  }

  const keys = [...new Set([...officialPoints.keys(), ...localPoints.keys()])]
    .filter((key) => key !== "")
    .sort();

  const points = keys.map((key) => {
    const officialPoint = pointOfOfficial(officialPoints.get(key));
    const localPoint = pointOfLocal(localPoints.get(key));
    return {
      key,
      date: key.slice(0, 10),
      official: officialPoint,
      local: localPoint,
      deltaTokens: officialPoint.tokens - localPoint.tokens,
      coverage: ratio(localPoint.tokens, officialPoint.tokens),
    };
  });

  const caveats = [];
  if (!official.available) {
    caveats.push(
      deps.officialError === "unauthenticated"
        ? "官方账号未登录，当前只显示本地会话日志。"
        : "官方账单暂不可用，当前只显示本地会话日志。"
    );
  }
  if (!local.available) {
    caveats.push(
      deps.localError === "local-unavailable"
        ? "当前宿主没有提供会话日志读取能力，只显示官方账单。"
        : "本地会话日志暂不可用，当前只显示官方账单。"
    );
  }
  if (official.available && local.available) {
    caveats.push(
      "官方为账户全量，本地仅本机 DSH 会话；未覆盖部分可能来自其他客户端、中转/API Key 路由或已清理的会话。"
    );
    caveats.push("官方账单最多延迟约 5 分钟；本地会话日志实时。");
  }

  const window = deps.official?.window ?? deps.local?.window ?? { from: "", to: "" };
  const coverage = official.available && local.available ? ratio(local.tokens, official.tokens) : null;

  return {
    ok: true,
    source: "reconcile",
    fetchedAt: deps.now ?? Date.now(),
    range: deps.range ?? "custom",
    window,
    official: { ...official, error: deps.officialError ?? null },
    local,
    coverage,
    delta: {
      tokens: official.tokens - local.tokens,
      requests: official.requests - local.requests,
    },
    points,
    caveats,
  };
}
