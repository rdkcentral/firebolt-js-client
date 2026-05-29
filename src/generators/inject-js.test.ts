/**
 * Tests for the inject-js generator output (tasks 5.1 – 5.19).
 *
 * Strategy: build a minimal synthetic CanonicalAST, run generate(), then
 * eval the output in a Node vm context with a mock __firebolt_transport__.
 */

import * as vm from "vm";
import { CanonicalAST, Module } from "../ast/types";
import { GenConfig } from "./index";

// Import the generator module for side-effects (registers itself)
import "./inject-js";
import { runAllFullAST } from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal CanonicalAST with one web module that has a call and a subscribe */
function makeAST(extra: Partial<CanonicalAST> = {}): CanonicalAST {
  const localeModule: Module = {
    name: "Localization",
    platform: "web",
    types: [
      {
        kind: "enum",
        name: "Language",
        values: [
          { label: "English", value: "en", serializedId: "en" },
          { label: "French",  value: "fr", serializedId: "fr" },
        ],
      } as never,
    ],
    methods: [
      {
        kind: "call",
        name: "language",
        params: [],
        result: { kind: "primitive", primitive: "string" } as never,
      } as never,
      {
        kind: "subscribe",
        name: "onLanguageChanged",
        params: [],
        result: { kind: "primitive", primitive: "string" } as never,
      } as never,
    ],
  };

  return {
    version: "9.1.0",
    modules: [localeModule],
    ...extra,
  };
}

/**
 * Build a minimal AST that has an object-result subscribe (eventIsPrimitive = false)
 * and an array-result subscribe (also eventIsPrimitive = false).
 */
function makeASTWithObjectEvent(): CanonicalAST {
  const mod: Module = {
    name: "Discovery",
    platform: "web",
    types: [
      {
        kind: "object",
        name: "App",
        properties: [
          { name: "id",    type: { kind: "primitive", primitive: "string"  } as never, required: true  },
          { name: "title", type: { kind: "primitive", primitive: "string"  } as never, required: false },
        ],
      } as never,
    ],
    methods: [
      {
        kind: "subscribe",
        name: "onAvailableApps",
        params: [],
        result: { kind: "named", name: "App" } as never,
      } as never,
      {
        kind: "subscribe",
        name: "onAppList",
        params: [],
        result: { kind: "array", items: { kind: "named", name: "App" } } as never,
      } as never,
    ],
  };
  return { version: "9.0.0", modules: [mod] };
}

/** Generate the bundle code for a given AST */
function generateBundle(ast: CanonicalAST): string {
  const config: GenConfig = { outDir: "/tmp/test" };
  const outputs = runAllFullAST(ast, config, ["inject-js"]);
  return outputs[0].content;
}

/** Transport message listener registered by the bundle */
type MsgCb = (raw: string) => void;
/** Connection-status listener registered by the bundle */
type StatusCb = (status: string) => void;

interface MockTransport {
  msgCb: MsgCb | null;
  statusCb: StatusCb | null;
  sentMessages: string[];
  sendResult: { success: boolean; errorCode?: number };
  connect: (clientId: string) => void;
  disconnect: (clientId: string) => void;
  send: (clientId: string, msg: string) => { success: boolean; errorCode?: number };
  onMessage: (clientId: string, cb: MsgCb) => void;
  onConnectionStatus: (clientId: string, cb: StatusCb) => void;
}

function makeMockTransport(): MockTransport {
  const t: MockTransport = {
    msgCb: null,
    statusCb: null,
    sentMessages: [],
    sendResult: { success: true },
    connect: (_clientId) => {},
    disconnect: (_clientId) => {},
    send: (_clientId, msg) => {
      t.sentMessages.push(msg);
      return t.sendResult;
    },
    onMessage: (_clientId, cb) => { t.msgCb = cb; },
    onConnectionStatus: (_clientId, cb) => { t.statusCb = cb; },
  };
  return t;
}

/**
 * Evaluate the bundle in a fresh vm context.
 * Returns { context, transport, FSM }.
 */
function evalBundle(code: string, mockTransport?: MockTransport) {
  const transport = mockTransport ?? makeMockTransport();
  const context: Record<string, unknown> = {
    window: {
      __firebolt_transport__: transport,
    },
    globalThis: undefined as unknown,
    console: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
    Promise,
    JSON,
    Array,
    Object,
    RegExp,
  };
  // Let globalThis point to the same context so the defineProperty attaches FSM there
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(code, context);
  const fsm = context.FireboltServiceManager as { version: string; configure: (cfg: { clientId: string }) => void; get: () => Promise<unknown> };
  return { context, transport, fsm };
}

// ---------------------------------------------------------------------------
// 5.1  _VERSION matches ast.version
// ---------------------------------------------------------------------------
test("5.1 _VERSION matches ast.version", () => {
  const ast = makeAST({ version: "9.1.0" });
  const code = generateBundle(ast);
  expect(code).toContain('"9.1.0"');
});

// ---------------------------------------------------------------------------
// 5.2  FireboltServiceManager is frozen with exactly version, configure, get
// ---------------------------------------------------------------------------
test("5.2 FireboltServiceManager is frozen and has only version, configure, get", () => {
  const { fsm } = evalBundle(generateBundle(makeAST()));
  expect(Object.isFrozen(fsm)).toBe(true);
  const keys = Object.keys(fsm as object).sort();
  expect(keys).toEqual(["configure", "get", "version"].sort());
});

// ---------------------------------------------------------------------------
// 5.3  get() before configure() throws
// ---------------------------------------------------------------------------
test("5.3 get() before configure() throws synchronously", () => {
  const { fsm } = evalBundle(generateBundle(makeAST()));
  expect(() => fsm.get()).toThrow(/configure/i);
});

// ---------------------------------------------------------------------------
// 5.4  configure() before transport exists does not throw
// ---------------------------------------------------------------------------
test("5.4 configure() before __firebolt_transport__ does not throw", () => {
  // Provide a context without __firebolt_transport__
  const ast = makeAST();
  const code = generateBundle(ast);
  const context: Record<string, unknown> = {
    window: {},
    globalThis: undefined as unknown,
    console: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
    Promise, JSON, Array, Object, RegExp,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(code, context);
  const fsm = context.FireboltServiceManager as { configure: (cfg: { clientId: string }) => void };
  expect(() => fsm.configure({ clientId: "ext-123" })).not.toThrow();
});

// ---------------------------------------------------------------------------
// 5.5  get() resolves after transport emits "connected"
// ---------------------------------------------------------------------------
test("5.5 get() resolves with FireboltClient after transport emits connected", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-1" });

  const promise = fsm.get();
  // Simulate transport becoming connected
  transport.statusCb!("connected");

  const client = await promise;
  expect(client).toBeDefined();
});

// ---------------------------------------------------------------------------
// 5.6  Multiple concurrent get() callers resolve with same reference
// ---------------------------------------------------------------------------
test("5.6 multiple concurrent get() calls resolve to the same FireboltClient", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-2" });

  const p1 = fsm.get();
  const p2 = fsm.get();
  const p3 = fsm.get();

  transport.statusCb!("connected");

  const [c1, c2, c3] = await Promise.all([p1, p2, p3]);
  expect(c1).toBe(c2);
  expect(c2).toBe(c3);
});

// ---------------------------------------------------------------------------
// 5.7  get() after already connected resolves immediately (same microtask tick)
// ---------------------------------------------------------------------------
test("5.7 get() after connected resolves immediately", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-3" });

  // Connect first
  const p1 = fsm.get();
  transport.statusCb!("connected");
  await p1;

  // Second get should resolve right away
  let resolved = false;
  const p2 = (fsm.get() as Promise<unknown>).then(() => { resolved = true; });
  await Promise.resolve(); // flush microtask
  await p2;
  expect(resolved).toBe(true);
});

// ---------------------------------------------------------------------------
// 5.8  FireboltClient and module namespaces are frozen; native-only modules absent
// ---------------------------------------------------------------------------
test("5.8 FireboltClient is frozen; web module present; no native-only module", async () => {
  // Add a native-only module that should NOT appear in the bundle
  const nativeMod: Module = {
    name: "NativeOnly",
    platform: "native",
    types: [],
    methods: [
      {
        kind: "call", name: "ping", params: [],
        result: { kind: "primitive", primitive: "string" } as never,
      } as never,
    ],
  };
  const ast = makeAST();
  ast.modules.push(nativeMod);

  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-4" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as Record<string, unknown>;

  expect(Object.isFrozen(client)).toBe(true);
  expect(client.Localization).toBeDefined();
  expect(Object.isFrozen(client.Localization)).toBe(true);
  expect(client.NativeOnly).toBeUndefined();
});

// ---------------------------------------------------------------------------
// 5.9  Call stub sends correct JSON-RPC via transport.send
// ---------------------------------------------------------------------------
test("5.9 call stub sends correct JSON-RPC message", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-5" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { language: (p?: Record<string, unknown>) => Promise<unknown> } };

  // Trigger the call (won't resolve yet, but we can inspect sent messages)
  const callPromise = client.Localization.language({});

  expect(transport.sentMessages).toHaveLength(1);
  const msg = JSON.parse(transport.sentMessages[0]);
  expect(msg.jsonrpc).toBe("2.0");
  expect(msg.method).toBe("Localization.language");
  expect(typeof msg.id).toBe("number");
  expect(msg.params).toBeDefined();

  // Simulate response to resolve the promise
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: "en" }));
  const result = await callPromise;
  expect(result).toBe("en");
});

// ---------------------------------------------------------------------------
// 5.10  Call stub rejects on params validation failure
// ---------------------------------------------------------------------------
test("5.10 call stub rejects on invalid params", async () => {
  // Module with a call that requires a string param
  const mod: Module = {
    name: "Localization",
    platform: "web",
    types: [],
    methods: [
      {
        kind: "call",
        name: "setLanguage",
        params: [{ name: "language", type: { kind: "primitive", primitive: "string" } as never, required: true }],
        result: { kind: "null" } as never,
      } as never,
    ],
  };
  const ast: CanonicalAST = { version: "9.0", modules: [mod] };
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-6" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { setLanguage: (p: Record<string, unknown>) => Promise<unknown> } };

  await expect(client.Localization.setLanguage({ language: 42 as unknown as string }))
    .rejects.toThrow(/Invalid params/);
});

// ---------------------------------------------------------------------------
// 5.11  Call stub rejects on result validation failure
// ---------------------------------------------------------------------------
test("5.11 call stub rejects on invalid result", async () => {
  const ast = makeAST(); // language() returns string
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-7" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { language: (p?: Record<string, unknown>) => Promise<unknown> } };

  const callPromise = client.Localization.language({});
  const id = JSON.parse(transport.sentMessages[0]).id;

  // Return a number instead of string
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id, result: 42 }));
  await expect(callPromise).rejects.toThrow(/Invalid result/);
});

// ---------------------------------------------------------------------------
// 5.12  Call stub rejects on backend error
// ---------------------------------------------------------------------------
test("5.12 call stub rejects on backend {id, error}", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-8" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { language: (p?: Record<string, unknown>) => Promise<unknown> } };

  const callPromise = client.Localization.language({});
  const id = JSON.parse(transport.sentMessages[0]).id;

  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } }));
  await expect(callPromise).rejects.toThrow(/Method not found/);
});

// ---------------------------------------------------------------------------
// 5.13  Subscribe sends {listen:true}, resolves with unsubscribeFn on ack
// ---------------------------------------------------------------------------
test("5.13 subscribe sends {listen:true} and resolves with unsubscribeFn on ack", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-9" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { onLanguageChanged: (cb: (v: unknown) => void) => Promise<() => void> } };

  const cb = jest.fn();
  const subPromise = client.Localization.onLanguageChanged(cb);

  // Should have sent {listen:true}
  const sent = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]);
  expect(sent.method).toBe("Localization.onLanguageChanged");
  expect(sent.params.listen).toBe(true);

  // Ack with {id, result: null}
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: sent.id, result: null }));
  const unsub = await subPromise;
  expect(typeof unsub).toBe("function");
});

// ---------------------------------------------------------------------------
// 5.14  Subscribe rejects and removes listener on backend error
// ---------------------------------------------------------------------------
test("5.14 subscribe rejects on backend error and removes the listener", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-10" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { onLanguageChanged: (cb: (v: unknown) => void) => Promise<() => void> } };

  const cb = jest.fn();
  const subPromise = client.Localization.onLanguageChanged(cb);

  const sent = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]);
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: sent.id, error: { code: -32001, message: "Not allowed" } }));

  await expect(subPromise).rejects.toThrow(/Not allowed/);

  // Now simulate an event — callback should NOT be invoked
  transport.msgCb!(JSON.stringify({ method: "Localization.onLanguageChanged", params: { value: "fr" } }));
  expect(cb).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// 5.15  Primitive event (params.value) dispatches correctly
// ---------------------------------------------------------------------------
test("5.15 primitive event (params.value) dispatches to callback", async () => {
  const ast = makeAST(); // onLanguageChanged → string (primitive)
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-11" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { onLanguageChanged: (cb: (v: unknown) => void) => Promise<() => void> } };

  const cb = jest.fn();
  const subPromise = client.Localization.onLanguageChanged(cb);
  const sent = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]);
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: sent.id, result: null }));
  await subPromise;

  transport.msgCb!(JSON.stringify({ method: "Localization.onLanguageChanged", params: { value: "fr" } }));
  expect(cb).toHaveBeenCalledWith("fr");
});

// ---------------------------------------------------------------------------
// 5.16  Object event (params directly) dispatches correctly
// ---------------------------------------------------------------------------
test("5.16 object event (params directly) dispatches to callback", async () => {
  const ast = makeASTWithObjectEvent();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-12" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Discovery: { onAvailableApps: (cb: (v: unknown) => void) => Promise<() => void> } };

  const cb = jest.fn();
  const subPromise = client.Discovery.onAvailableApps(cb);
  const sent = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]);
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: sent.id, result: null }));
  await subPromise;

  const app = { id: "app1", title: "App One" };
  transport.msgCb!(JSON.stringify({ method: "Discovery.onAvailableApps", params: app }));
  expect(cb).toHaveBeenCalledWith(app);
});

// ---------------------------------------------------------------------------
// 5.16b  Array event (params directly, not params.value) dispatches correctly
// ---------------------------------------------------------------------------
test("5.16b array event (params directly) dispatches to callback", async () => {
  const ast = makeASTWithObjectEvent();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-12b" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Discovery: { onAppList: (cb: (v: unknown) => void) => Promise<() => void> } };

  const cb = jest.fn();
  const subPromise = client.Discovery.onAppList(cb);
  const sent = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]);
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: sent.id, result: null }));
  await subPromise;

  const apps = [{ id: "a1", title: "A1" }, { id: "a2", title: "A2" }];
  transport.msgCb!(JSON.stringify({ method: "Discovery.onAppList", params: apps }));
  expect(cb).toHaveBeenCalledWith(apps);
});

// ---------------------------------------------------------------------------
// 5.17  Invalid event payload → not dispatched, console.warn issued
// ---------------------------------------------------------------------------
test("5.17 invalid event payload is not dispatched and console.warn is called", async () => {
  const ast = makeAST(); // onLanguageChanged → string
  const transport = makeMockTransport();
  const warnSpy = jest.fn();
  const context: Record<string, unknown> = {
    window: { __firebolt_transport__: transport },
    globalThis: undefined as unknown,
    console: { warn: warnSpy, error: jest.fn(), log: jest.fn() },
    Promise, JSON, Array, Object, RegExp,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(generateBundle(ast), context);
  type FSMType = { version: string; configure: (cfg: { clientId: string }) => void; get: () => Promise<unknown> };
  const fsm2 = context.FireboltServiceManager as FSMType;

  fsm2.configure({ clientId: "ext-13" });
  const p = (fsm2.get as () => Promise<unknown>)();
  transport.statusCb!("connected");
  const client = await p as { Localization: { onLanguageChanged: (cb: (v: unknown) => void) => Promise<() => void> } };

  const cb = jest.fn();
  const subPromise = client.Localization.onLanguageChanged(cb);
  const sent = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]);
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: sent.id, result: null }));
  await subPromise;

  // Send a number instead of a string
  transport.msgCb!(JSON.stringify({ method: "Localization.onLanguageChanged", params: { value: 999 } }));
  expect(cb).not.toHaveBeenCalled();
  expect(warnSpy).toHaveBeenCalled();


});

// ---------------------------------------------------------------------------
// 5.18  unsubscribeFn removes callback and sends {listen:false} when no listeners remain
// ---------------------------------------------------------------------------
test("5.18 unsubscribeFn sends {listen:false} when last listener removed", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-14" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { onLanguageChanged: (cb: (v: unknown) => void) => Promise<() => void> } };

  const cb = jest.fn();
  const subPromise = client.Localization.onLanguageChanged(cb);
  const sent = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]);
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: sent.id, result: null }));
  const unsub = await subPromise;

  const countBefore = transport.sentMessages.length;
  (unsub as () => void)();

  // An extra message should have been sent with {listen:false}
  expect(transport.sentMessages.length).toBeGreaterThan(countBefore);
  const unsubMsg = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]);
  expect(unsubMsg.method).toBe("Localization.onLanguageChanged");
  expect(unsubMsg.params.listen).toBe(false);

  // Callback should no longer be invoked
  transport.msgCb!(JSON.stringify({ method: "Localization.onLanguageChanged", params: { value: "de" } }));
  expect(cb).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// 5.19  unsubscribeFn does NOT send {listen:false} when other listeners remain
// ---------------------------------------------------------------------------
test("5.19 unsubscribeFn does NOT send {listen:false} when other listeners remain", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.configure({ clientId: "ext-15" });
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { onLanguageChanged: (cb: (v: unknown) => void) => Promise<() => void> } };

  const cb1 = jest.fn();
  const cb2 = jest.fn();

  const sub1 = client.Localization.onLanguageChanged(cb1);
  const id1 = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]).id;
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: id1, result: null }));
  const unsub1 = await sub1;

  const sub2 = client.Localization.onLanguageChanged(cb2);
  const id2 = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]).id;
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: id2, result: null }));
  await sub2;

  const countBefore = transport.sentMessages.length;
  (unsub1 as () => void)(); // remove only first listener

  // Should NOT have sent {listen:false}
  expect(transport.sentMessages.length).toBe(countBefore);

  // cb2 should still receive events
  transport.msgCb!(JSON.stringify({ method: "Localization.onLanguageChanged", params: { value: "fr" } }));
  expect(cb2).toHaveBeenCalledWith("fr");
  expect(cb1).not.toHaveBeenCalled();
});
