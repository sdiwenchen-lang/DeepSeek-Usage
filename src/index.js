/**
 * DeepMeter — DeepSeek Harness 插件入口（服务端半边）。
 *
 * 形态对齐宿主自带插件：
 *   - Cordis 插件（cordis.patch.yml），无构建。
 *   - 客户端半边是 `__ModuleLoader__` bundle，由 src/client.js 提供。
 *   - 服务端半边通过 `ctx.inject(['webServer'|'httpServer'])` 注册回环端点。
 *
 * 职责：
 *   1. 启动时构造 apiClient / auth / cache。
 *   2. 等 webServer 可用时注册端点（见 http.registerRoutes）。
 *   3. 注册 `deepmeter` 命令（CLI 体检）。
 *   4. 卸载时清理缓存与 in-flight。
 *
 * 不提供登录：直接读宿主 credentials 里 `deepseek-account-platform/default`
 * 的会话 grant，用它带 `x-dsh-auth-token` 调官方平台接口。
 *
 * @module deepseek-usage
 */

import { createAccountSource } from "./account.js";
import { createApiClient } from "./apiclient.js";
import { createCache } from "./cache.js";
import { BASE_PATH, registerRoutes } from "./http.js";
import { createLocalSource } from "./local.js";

export const name = "deepseek-usage";

/** DeepMeter 是否需要主动注入的服务（必填）。 */
export const inject = ["credentials"];

/** 可选服务：webServer / httpServer（在其中之一就绪时注册端点）/ commands / 本地会话日志。 */
export const optional = ["webServer", "httpServer", "commands", "sessionPersistence"];

/**
 * 可配置项（对齐 cordis.patch.yml）。
 */
export function apply(ctx, config = {}) {
  const logger = ctx.logger;

  // 1. 构造依赖
  const api = createApiClient({
    xAppVersion: config.xAppVersion ?? "0.1.0",
    timeoutMs: config.requestTimeoutMs ?? 10_000,
    backoffMs: config.retryBackoffMs ?? [1000, 2000, 4000],
    log: (...args) => logger?.info?.("deepseek-usage.apiclient:", ...args),
  });

  const cache = createCache({ ttlMs: config.cacheTtlMs ?? 600_000 });

  // 账号会话直接复用宿主里已登录的 DeepSeek 账号 grant（不登录、不落盘、不存密码）。
  const account = createAccountSource(ctx.credentials);

  // 本地聚合：只读宿主 sessionPersistence，不建库、不依赖 TokenLedger。
  // `ctx.get` 探测而非直接读属性，保持软依赖（旧宿主没有该服务时端点返回 503）。
  let persistence;
  try {
    persistence = typeof ctx.get === "function" ? ctx.get("sessionPersistence") : undefined;
  } catch {
    persistence = undefined;
  }
  const local = createLocalSource({
    persistence,
    logger,
    config: config.local ?? {},
  });

  // 2. 注册回环端点
  registerRoutes(ctx, {
    account,
    api,
    cache,
    local,
    pricing: local.pricing,
    logger,
    lookbackMonths: config.lookbackMonths ?? 24,
  });

  // 3. CLI 命令（P5）。`commands` 是可选服务：Cordis 4 下直接读 `ctx.commands`
  // 会抛 "cannot get property ... without inject"（`optional` 声明不豁免这条），
  // 所以用 ctx.get 探测，保持软依赖。
  const commands = typeof ctx.get === "function" ? ctx.get("commands") : undefined;
  if (commands && typeof commands.command === "function") {
    commands.command("deepseek-usage", "DeepSeek 官方用量查询").action(async () => {
      const status = await account.status();
      logger?.info?.("deepseek-usage: status=%j", status);
      return status;
    });
  }

  // 4. 卸载时清理（P4）
  ctx.on("dispose", () => {
    cache.clear();
    local.clear();
  });
}

export { BASE_PATH };
