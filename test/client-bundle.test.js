/**
 * 客户端 bundle 契约测试 —— 在 Node 里模拟宿主的 `window.__ModuleLoader__`，
 * 把 src/client.js 真正执行一次，验证它交出来的模块能被宿主接住。
 *
 * 覆盖的是"加载成功但面板不显示"这一类故障：
 *   - 模块导出里必须有 inject + apply（没有 apply 就没有任何东西进侧边栏）
 *   - apply 必须通过 ctx.slots.inject 注册到 sidebar.footer.action
 *   - 注册的组件要能渲染，且渲染时不去碰 DOM / 定时器
 */

import test from "node:test";
import assert from "node:assert/strict";

const SEAT = "sidebar.footer.action";

/** 装载 bundle：造一个假的 __ModuleLoader__，把 factory 跑出来。 */
async function loadBundle() {
  let captured;
  globalThis.window = {
    __ModuleLoader__: {
      load(entry) {
        captured = entry;
      },
    },
  };

  await import(`../src/client.js?t=${Date.now()}`);

  assert.ok(captured, "bundle must call window.__ModuleLoader__.load");
  assert.equal(typeof captured.id, "string");
  assert.equal(typeof captured.factory, "function");

  // 宿主提供的同步 require：只认 react 与 jsx-runtime，其余模块一律当作不存在，
  // 这样 bundle 里任何多余的 require 都会立刻暴露。
  const require = (spec) => {
    if (spec === "react") {
      return {
        useState: () => [undefined, () => {}],
        useEffect: () => {},
        useRef: () => ({ current: null }),
        useCallback: (fn) => fn,
        useMemo: (fn) => fn(),
        memo: (fn) => fn,
      };
    }
    if (spec === "react/jsx-runtime") {
      return { jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props, key) => ({ type, props, key }) };
    }
    throw new Error(`unexpected require: ${spec}`);
  };

  return { entry: captured, exports: captured.factory(require) };
}

/** 走一遍真实注册路径，拿回宿主会渲染的那个组件。 */
function seatComponent(exports) {
  let component;
  exports.apply({
    slots: {
      inject(name, factory) {
        factory();
      },
      register(config, registered) {
        component = registered;
        return () => {};
      },
    },
  });
  return component;
}

test("bundle 导出 inject + apply，形状符合宿主契约", async () => {
  const { exports } = await loadBundle();
  assert.equal(typeof exports.apply, "function", "missing apply()");
  assert.deepEqual(exports.inject, ["slots"]);
  // 回归守卫：加载器把 `default` 当插件本体，导出 default 会让 apply 永不被调用，
  // fiber 卡在 loading，客户端 boot 报 "deepseek-usage: loading"。
  assert.equal(exports.default, undefined, "must not export default");
});

test("apply() 把席位注册到 sidebar.footer.action", async () => {
  const { exports } = await loadBundle();
  const registered = [];
  const injected = [];

  const ctx = {
    slots: {
      inject(name, factory) {
        injected.push(name);
        return factory();
      },
      register(config, component) {
        registered.push({ config, component });
        return () => {};
      },
    },
  };

  exports.apply(ctx);

  assert.deepEqual(injected, [SEAT]);
  assert.equal(registered.length, 1);
  assert.equal(registered[0].config.name, SEAT);
  assert.equal(registered[0].config.id, "deepseek-usage");
  assert.equal(typeof registered[0].component, "function");
});

test("席位组件渲染出按钮，关着的时候不挂 Panel", async () => {
  const { exports } = await loadBundle();
  const Seat = seatComponent(exports);
  const tree = Seat({ wide: true });

  assert.equal(tree.type, "div");
  assert.equal(tree.props.className, "d-seat-layer");
  const [button, panel] = tree.props.children;
  assert.equal(button.type, "button");
  assert.equal(button.props["aria-label"], "DeepSeek Usage 用量与余额");
  assert.equal(button.props.title, undefined, "no native title tooltip");
  assert.equal(panel, null, "panel must stay unmounted while closed");
});

test("bundle 不在模块顶层碰 document", async () => {
  const previous = globalThis.document;
  delete globalThis.document;
  try {
    await loadBundle();
    assert.ok(true, "load must not require document");
  } finally {
    if (previous !== undefined) globalThis.document = previous;
  }
});
