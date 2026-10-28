/**
 * 账号会话来源：直接复用 DSH 里**已登录**的 DeepSeek 账号凭据。
 *
 * 本插件不做登录。宿主把平台会话 grant 存在自己的凭据库里：
 *
 *   records["deepseek-account-platform/default"] = {
 *     kind: "grant",
 *     payload: { version, token, issuer },
 *   }
 *
 * 我们在每次取数时按需读出 token（带 60s 缓存），供 apiclient 带上
 * `x-dsh-auth-token` 调官方接口。用户在 DSH 里登录/退出账号，这里自然跟随。
 *
 * 没有该记录（未登录）时 `getToken()` 返回 undefined，端点回 401，
 * 前端只显示一行提示，不提供任何登录表单。
 *
 * @module deepseek-usage/account
 */

/** 宿主凭据记录：owner。 */
export const ACCOUNT_OWNER = "deepseek-account-platform";

/** 宿主凭据记录：id。 */
export const ACCOUNT_RECORD_ID = "default";

/** 记录键（`<owner>/<id>`）。 */
export const ACCOUNT_RECORD_KEY = `${ACCOUNT_OWNER}/${ACCOUNT_RECORD_ID}`;

/** token 缓存时长：够短，用户退出账号后很快失效；够长，面板连续刷新不重复读库。 */
const TOKEN_TTL_MS = 60_000;

/**
 * 造一个账号会话来源。
 *
 * @param {object} [host] 宿主 credentials 服务（record 面）
 * @param {{ttlMs?: number, now?: () => number}} [opts]
 * @returns {{kind: string, getToken: Function, status: Function, invalidate: Function}}
 */
export function createAccountSource(host, opts = {}) {
  const ttlMs = opts.ttlMs ?? TOKEN_TTL_MS;
  const now = opts.now ?? (() => Date.now());

  let cached; // { token?: string, at: number }
  let inflight;

  const canRead = typeof host?.readRecord === "function";

  /**
   * 读宿主记录里的 token。
   * @returns {Promise<string|undefined>}
   */
  async function readToken() {
    if (!canRead) return undefined;
    const record = await host.readRecord(ACCOUNT_RECORD_KEY);
    if (!record || typeof record !== "object") return undefined;
    const payload = record.payload;
    const token = payload && typeof payload === "object" ? payload.token : undefined;
    return typeof token === "string" && token.length > 0 ? token : undefined;
  }

  return {
    kind: canRead ? "record" : "none",

    /**
     * 取平台会话 token（带缓存与并发去重）。
     * @param {boolean} [force] 忽略缓存
     * @returns {Promise<string|undefined>}
     */
    async getToken(force = false) {
      const at = now();
      if (!force && cached && at - cached.at < ttlMs) return cached.token;
      if (!inflight) {
        inflight = readToken()
          .then((token) => {
            cached = { token, at: now() };
            return token;
          })
          .finally(() => {
            inflight = undefined;
          });
      }
      return inflight;
    },

    /** 丢掉缓存：拿到 401 时调用，下次重新读库（用户可能刚重新登录）。 */
    invalidate() {
      cached = undefined;
    },

    /** 给 /status 用的状态。 */
    async status() {
      const token = await this.getToken().catch(() => undefined);
      return {
        logged: typeof token === "string" && token.length > 0,
        source: canRead ? ACCOUNT_RECORD_KEY : "none",
        degraded: false,
      };
    },
  };
}
