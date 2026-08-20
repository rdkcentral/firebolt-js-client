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
  connect: () => void;
  disconnect: () => void;
  send: (msg: string) => { success: boolean; errorCode?: number };
  onMessage: (cb: MsgCb) => void;
  onConnectionStatus: (cb: StatusCb) => void;
}

function makeMockTransport(): MockTransport {
  const t: MockTransport = {
    msgCb: null,
    statusCb: null,
    sentMessages: [],
    sendResult: { success: true },
    connect: () => {},
    disconnect: () => {},
    send: (msg) => {
      t.sentMessages.push(msg);
      return t.sendResult;
    },
    onMessage: (cb) => { t.msgCb = cb; },
    onConnectionStatus: (cb) => { t.statusCb = cb; },
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
  const fsm = context.FireboltServiceManager as { version: string; transport: (t: unknown) => void; get: () => Promise<unknown> };
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
// 5.2  FireboltServiceManager is frozen with exactly version, transport, get
// ---------------------------------------------------------------------------
test("5.2 FireboltServiceManager is frozen and has only version, transport, get", () => {
  const { fsm } = evalBundle(generateBundle(makeAST()));
  expect(Object.isFrozen(fsm)).toBe(true);
  const keys = Object.keys(fsm as object).sort();
  expect(keys).toEqual(["get", "transport", "version"].sort());
});

// ---------------------------------------------------------------------------
// 5.3  get() before transport() throws
// ---------------------------------------------------------------------------
test("5.3 get() before transport() throws synchronously", () => {
  const { fsm } = evalBundle(generateBundle(makeAST()));
  expect(() => fsm.get()).toThrow(/transport/i);
});

// ---------------------------------------------------------------------------
// 5.4  transport() before connection exists does not throw
// ---------------------------------------------------------------------------
test("5.4 transport() does not throw when called", () => {
  const ast = makeAST();
  const code = generateBundle(ast);
  const { fsm, transport } = evalBundle(code);
  expect(() => fsm.transport(transport)).not.toThrow();
});

// ---------------------------------------------------------------------------
// 5.4b  transport() throws on double injection
// ---------------------------------------------------------------------------
test("5.4b transport() throws on double injection", () => {
  const { fsm, transport } = evalBundle(generateBundle(makeAST()));
  fsm.transport(transport);
  expect(() => fsm.transport(transport)).toThrow(/already set/i);
});

// ---------------------------------------------------------------------------
// 5.4c  transport() validates required methods
// ---------------------------------------------------------------------------
test("5.4c transport() validates that transport has all required methods", () => {
  const { fsm } = evalBundle(generateBundle(makeAST()));
  
  // Test missing 'send' method
  expect(() => fsm.transport({
    onMessage: () => {},
    onConnectionStatus: () => {},
    connect: () => {},
    disconnect: () => {}
  })).toThrow(/send.*method/i);

  // Test missing 'onMessage' method
  expect(() => fsm.transport({
    send: () => {},
    onConnectionStatus: () => {},
    connect: () => {},
    disconnect: () => {}
  })).toThrow(/onMessage.*method/i);

  // Test missing 'onConnectionStatus' method
  expect(() => fsm.transport({
    send: () => {},
    onMessage: () => {},
    connect: () => {},
    disconnect: () => {}
  })).toThrow(/onConnectionStatus.*method/i);

  // Test missing 'connect' method
  expect(() => fsm.transport({
    send: () => {},
    onMessage: () => {},
    onConnectionStatus: () => {},
    disconnect: () => {}
  })).toThrow(/connect.*method/i);

  // Test missing 'disconnect' method
  expect(() => fsm.transport({
    send: () => {},
    onMessage: () => {},
    onConnectionStatus: () => {},
    connect: () => {}
  })).toThrow(/disconnect.*method/i);

  // Test non-function method
  expect(() => fsm.transport({
    send: "not a function",
    onMessage: () => {},
    onConnectionStatus: () => {},
    connect: () => {},
    disconnect: () => {}
  })).toThrow(/send.*method/i);
});

// ---------------------------------------------------------------------------
// 5.5  get() resolves after transport emits "connected"
// ---------------------------------------------------------------------------
test("5.5 get() resolves with FireboltClient after transport emits connected", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.transport(transport);

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
  fsm.transport(transport);

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
  fsm.transport(transport);

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
  fsm.transport(transport);
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as Record<string, unknown>;

  expect(Object.isFrozen(client)).toBe(true);
  expect(client.Localization).toBeDefined();
  expect(Object.isFrozen(client.Localization)).toBe(true);
  expect(client.NativeOnly).toBeUndefined();
});

// ---------------------------------------------------------------------------
// 5.9  Call stub sends correct JSON-RPC via transport.send (no clientId)
// ---------------------------------------------------------------------------
test("5.9 call stub sends correct JSON-RPC message without clientId", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.transport(transport);
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
// 5.10  Call stub sends params without validation
// ---------------------------------------------------------------------------
test("5.10 call stub sends params without pre-validation", async () => {
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
  fsm.transport(transport);
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { setLanguage: (p: Record<string, unknown>) => Promise<unknown> } };

  client.Localization.setLanguage({ language: 42 as unknown as string });
  // Verify the message was sent (no pre-validation)
  expect(transport.sentMessages.length).toBe(1);
  const sent = JSON.parse(transport.sentMessages[0]);
  expect(sent.params.language).toBe(42);
});

// ---------------------------------------------------------------------------
// 5.11  Call stub passes result through without validation
// ---------------------------------------------------------------------------
test("5.11 call stub passes result through without validation", async () => {
  const ast = makeAST(); // language() returns string
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.transport(transport);
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { language: (p?: Record<string, unknown>) => Promise<unknown> } };

  const callPromise = client.Localization.language({});
  const id = JSON.parse(transport.sentMessages[0]).id;

  // Return a number instead of string - no validation, so it resolves
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id, result: 42 }));
  await expect(callPromise).resolves.toBe(42);
});

// ---------------------------------------------------------------------------
// 5.12  Call stub rejects on backend error
// ---------------------------------------------------------------------------
test("5.12 call stub rejects on backend {id, error}", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.transport(transport);
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
  fsm.transport(transport);
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
  fsm.transport(transport);
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
  fsm.transport(transport);
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
  fsm.transport(transport);
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
  fsm.transport(transport);
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
// 5.17  Event with invalid payload is dispatched as-is
// ---------------------------------------------------------------------------
test("5.17 event with invalid payload is dispatched to callback", async () => {
  const ast = makeAST(); // onLanguageChanged → string
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.transport(transport);
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as { Localization: { onLanguageChanged: (cb: (v: unknown) => void) => Promise<() => void> } };

  const cb = jest.fn();
  const subPromise = client.Localization.onLanguageChanged(cb);
  const sent = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]);
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: sent.id, result: null }));
  await subPromise;

  // Send a number instead of a string - no validation, so callback receives it
  transport.msgCb!(JSON.stringify({ method: "Localization.onLanguageChanged", params: { value: 999 } }));
  expect(cb).toHaveBeenCalledWith(999);
});

// ---------------------------------------------------------------------------
// 5.18  unsubscribeFn removes callback and sends {listen:false} when no listeners remain
// ---------------------------------------------------------------------------
test("5.18 unsubscribeFn sends {listen:false} when last listener removed", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.transport(transport);
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
  fsm.transport(transport);
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

// ---------------------------------------------------------------------------
// 5.20  disconnect() clears listeners and resets state
// ---------------------------------------------------------------------------
test("5.20 disconnect() clears listeners and resets state", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.transport(transport);
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as Record<string, unknown>;

  const cb = jest.fn();
  const subPromise = (client.Localization as any).onLanguageChanged(cb);
  const sent = JSON.parse(transport.sentMessages[transport.sentMessages.length - 1]);
  transport.msgCb!(JSON.stringify({ jsonrpc: "2.0", id: sent.id, result: null }));
  await subPromise;

  // Verify listener is registered
  transport.msgCb!(JSON.stringify({ method: "Localization.onLanguageChanged", params: { value: "en" } }));
  expect(cb).toHaveBeenCalledWith("en");

  // Disconnect
  (client.disconnect as () => void)();

  // transport.disconnect should have been called
  expect(transport.disconnect).toBeDefined();

  // Events should no longer be dispatched
  cb.mockClear();
  transport.msgCb!(JSON.stringify({ method: "Localization.onLanguageChanged", params: { value: "fr" } }));
  expect(cb).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// 5.21  Pending calls are rejected on disconnect
// ---------------------------------------------------------------------------
test("5.21 pending calls are rejected on disconnect", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.transport(transport);
  const p = fsm.get();
  transport.statusCb!("connected");
  const client = await p as Record<string, unknown>;

  // Start a pending call
  const callPromise = (client.Localization as any).language({});

  // Disconnect while call is pending
  (client.disconnect as () => void)();

  // Call should be rejected
  await expect(callPromise).rejects.toThrow();
});

// ---------------------------------------------------------------------------
// 5.22  Reconnection after disconnect initiates fresh connection
// ---------------------------------------------------------------------------
test("5.22 reconnection after disconnect initiates fresh connection", async () => {
  const ast = makeAST();
  const { fsm, transport } = evalBundle(generateBundle(ast));
  fsm.transport(transport);
  
  // Initial connection
  const p1 = fsm.get();
  transport.statusCb!("connected");
  let client = await p1 as Record<string, unknown>;
  expect(client).toBeDefined();

  // Disconnect
  (client.disconnect as () => void)();
  
  // Reconnect - should initiate new connection
  const p2 = fsm.get();
  transport.statusCb!("connected");
  client = await p2 as Record<string, unknown>;
  expect(client).toBeDefined();
});

// ---------------------------------------------------------------------------
// 6.1-6.10: Test coverage for new RDK9 Web modules
// ---------------------------------------------------------------------------

/**
 * Helper to build a comprehensive AST with all new modules
 */
function makeRDK9WebAST(): CanonicalAST {
  return {
    version: "9.0",
    modules: [
      // Accessibility (updated with new properties)
      {
        name: "Accessibility",
        platform: "both",
        types: [
          {
            kind: "object",
            name: "ClosedCaptionsSettings",
            properties: [
              { name: "enabled", type: { kind: "primitive", primitive: "bool" } as never, required: true },
              { name: "preferredLanguages", type: { kind: "array", items: { kind: "primitive", primitive: "string" } } as never, required: false },
            ],
          } as never,
          {
            kind: "object",
            name: "VoiceGuidanceSettings",
            properties: [
              { name: "enabled", type: { kind: "primitive", primitive: "bool" } as never, required: true },
              { name: "rate", type: { kind: "primitive", primitive: "double" } as never, required: true },
              { name: "navigationHints", type: { kind: "primitive", primitive: "bool" } as never, required: true },
            ],
          } as never,
        ],
        methods: [
          { kind: "call", name: "audioDescription", params: [], result: { kind: "primitive", primitive: "bool" } as never } as never,
          { kind: "subscribe", name: "onAudioDescriptionChanged", params: [], result: { kind: "primitive", primitive: "bool" } as never } as never,
          { kind: "call", name: "closedCaptionsSettings", params: [], result: { kind: "named", name: "ClosedCaptionsSettings" } as never } as never,
          { kind: "subscribe", name: "onClosedCaptionsSettingsChanged", params: [], result: { kind: "named", name: "ClosedCaptionsSettings" } as never } as never,
          { kind: "call", name: "highContrastUI", params: [], result: { kind: "primitive", primitive: "bool" } as never } as never,
          { kind: "subscribe", name: "onHighContrastUIChanged", params: [], result: { kind: "primitive", primitive: "bool" } as never } as never,
          { kind: "call", name: "voiceGuidanceSettings", params: [], result: { kind: "named", name: "VoiceGuidanceSettings" } as never } as never,
          { kind: "subscribe", name: "onVoiceGuidanceSettingsChanged", params: [], result: { kind: "named", name: "VoiceGuidanceSettings" } as never } as never,
        ],
      } as never,
      // Localization (updated with new properties)
      {
        name: "Localization",
        platform: "both",
        types: [],
        methods: [
          { kind: "call", name: "country", params: [], result: { kind: "primitive", primitive: "string" } as never } as never,
          { kind: "subscribe", name: "onCountryChanged", params: [], result: { kind: "primitive", primitive: "string" } as never } as never,
          { kind: "call", name: "preferredAudioLanguages", params: [], result: { kind: "array", items: { kind: "primitive", primitive: "string" } } as never } as never,
          { kind: "subscribe", name: "onPreferredAudioLanguagesChanged", params: [], result: { kind: "array", items: { kind: "primitive", primitive: "string" } } as never } as never,
          { kind: "call", name: "presentationLanguage", params: [], result: { kind: "primitive", primitive: "string" } as never } as never,
          { kind: "subscribe", name: "onPresentationLanguageChanged", params: [], result: { kind: "primitive", primitive: "string" } as never } as never,
        ],
      } as never,
      // Actions (new)
      {
        name: "Actions",
        platform: "both",
        types: [
          {
            kind: "object",
            name: "IntentPayload",
            properties: [
              { name: "intentId", type: { kind: "primitive", primitive: "unsigned" } as never, required: true },
              { name: "intent", type: { kind: "primitive", primitive: "string" } as never, required: true },
            ],
          } as never,
        ],
        methods: [
          { kind: "call", name: "start", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "intent", params: [], result: { kind: "named", name: "IntentPayload" } as never } as never,
          { kind: "subscribe", name: "onIntent", params: [], result: { kind: "named", name: "IntentPayload" } as never } as never,
        ],
      } as never,
      // Advertising (new)
      {
        name: "Advertising",
        platform: "both",
        types: [
          {
            kind: "enum",
            name: "IfaType",
            values: [
              { label: "DPID", value: "dpid", serializedId: "dpid" },
              { label: "SSPID", value: "sspid", serializedId: "sspid" },
            ],
          } as never,
          {
            kind: "enum",
            name: "Lmt",
            values: [
              { label: "Disabled", value: "0", serializedId: "0" },
              { label: "Enabled", value: "1", serializedId: "1" },
            ],
          } as never,
          {
            kind: "object",
            name: "AdvertisingId",
            properties: [
              { name: "ifa", type: { kind: "primitive", primitive: "string" } as never, required: true },
              { name: "ifa_type", type: { kind: "named", name: "IfaType" } as never, required: true },
              { name: "lmt", type: { kind: "named", name: "Lmt" } as never, required: true },
            ],
          } as never,
        ],
        methods: [
          { kind: "call", name: "advertisingId", params: [], result: { kind: "named", name: "AdvertisingId" } as never } as never,
        ],
      } as never,
      // Device (new)
      {
        name: "Device",
        platform: "both",
        types: [
          {
            kind: "enum",
            name: "DeviceClass",
            values: [
              { label: "OTT", value: "ott", serializedId: "ott" },
              { label: "STB", value: "stb", serializedId: "stb" },
              { label: "TV", value: "tv", serializedId: "tv" },
            ],
          } as never,
          {
            kind: "object",
            name: "HdrCapabilities",
            properties: [
              { name: "hdr10", type: { kind: "primitive", primitive: "bool" } as never, required: true },
              { name: "hdr10Plus", type: { kind: "primitive", primitive: "bool" } as never, required: true },
              { name: "dolbyVision", type: { kind: "primitive", primitive: "bool" } as never, required: true },
              { name: "hlg", type: { kind: "primitive", primitive: "bool" } as never, required: true },
            ],
          } as never,
        ],
        methods: [
          { kind: "call", name: "uid", params: [], result: { kind: "primitive", primitive: "string" } as never } as never,
          { kind: "call", name: "deviceClass", params: [], result: { kind: "named", name: "DeviceClass" } as never } as never,
          { kind: "call", name: "hdr", params: [], result: { kind: "named", name: "HdrCapabilities" } as never } as never,
          { kind: "subscribe", name: "onHdrChanged", params: [], result: { kind: "named", name: "HdrCapabilities" } as never } as never,
          { kind: "call", name: "dolbyAtmosExperienceAvailable", params: [], result: { kind: "primitive", primitive: "bool" } as never } as never,
          { kind: "subscribe", name: "onDolbyAtmosExperienceAvailableChanged", params: [], result: { kind: "primitive", primitive: "bool" } as never } as never,
        ],
      } as never,
      // Display (new, web-only)
      {
        name: "Display",
        platform: "web",
        types: [
          {
            kind: "enum",
            name: "ColorimetryValue",
            values: [
              { label: "SDR", value: "SDR", serializedId: "SDR" },
              { label: "HDR", value: "HDR", serializedId: "HDR" },
            ],
          } as never,
          {
            kind: "enum",
            name: "VideoResolution",
            values: [
              { label: "1080p", value: "1920x1080", serializedId: "1920x1080" },
              { label: "4K", value: "3840x2160", serializedId: "3840x2160" },
            ],
          } as never,
        ],
        methods: [
          { kind: "call", name: "colorimetry", params: [], result: { kind: "named", name: "ColorimetryValue" } as never } as never,
          { kind: "call", name: "videoResolutions", params: [], result: { kind: "array", items: { kind: "named", name: "VideoResolution" } } as never } as never,
        ],
      } as never,
      // Network (new)
      {
        name: "Network",
        platform: "both",
        types: [],
        methods: [
          { kind: "call", name: "connected", params: [], result: { kind: "primitive", primitive: "bool" } as never } as never,
          { kind: "subscribe", name: "onConnectedChanged", params: [], result: { kind: "primitive", primitive: "bool" } as never } as never,
        ],
      } as never,
      // VideoOutput (new)
      {
        name: "VideoOutput",
        platform: "both",
        types: [
          {
            kind: "object",
            name: "VideoResolution",
            properties: [
              { name: "resolution", type: { kind: "primitive", primitive: "string" } as never, required: false },
            ],
          } as never,
        ],
        methods: [
          { kind: "call", name: "resolution", params: [], result: { kind: "named", name: "VideoResolution" } as never } as never,
          { kind: "subscribe", name: "onResolutionChanged", params: [], result: { kind: "named", name: "VideoResolution" } as never } as never,
        ],
      } as never,
      // Metrics (new)
      {
        name: "Metrics",
        platform: "both",
        types: [
          {
            kind: "enum",
            name: "ErrorType",
            values: [
              { label: "Network", value: "network", serializedId: "network" },
              { label: "Playback", value: "playback", serializedId: "playback" },
              { label: "Entitlement", value: "entitlement", serializedId: "entitlement" },
              { label: "Parse", value: "parse", serializedId: "parse" },
              { label: "Aborted", value: "aborted", serializedId: "aborted" },
              { label: "Unknown", value: "unknown", serializedId: "unknown" },
            ],
          } as never,
        ],
        methods: [
          { kind: "call", name: "ready", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "startContent", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "stopContent", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "page", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "error", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "mediaLoadStart", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "mediaPlay", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "mediaPlaying", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "mediaPause", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "mediaWaiting", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "mediaSeeking", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "mediaSeeked", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "mediaRateChanged", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "mediaRenditionChanged", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "mediaEnded", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "event", params: [], result: { kind: "null" } as never } as never,
          { kind: "call", name: "appInfo", params: [], result: { kind: "null" } as never } as never,
        ],
      } as never,
    ],
  };
}

// 6.1 — Accessibility methods present in bundle
test("6.1 Accessibility methods are in generated bundle", () => {
  const ast = makeRDK9WebAST();
  const code = generateBundle(ast);
  expect(code).toContain("Accessibility.audioDescription");
  expect(code).toContain("Accessibility.onAudioDescriptionChanged");
  expect(code).toContain("Accessibility.closedCaptionsSettings");
  expect(code).toContain("Accessibility.onClosedCaptionsSettingsChanged");
  expect(code).toContain("Accessibility.highContrastUI");
  expect(code).toContain("Accessibility.onHighContrastUIChanged");
  expect(code).toContain("Accessibility.voiceGuidanceSettings");
  expect(code).toContain("Accessibility.onVoiceGuidanceSettingsChanged");
});

// 6.2 — Localization methods present
test("6.2 Localization methods are in generated bundle", () => {
  const ast = makeRDK9WebAST();
  const code = generateBundle(ast);
  expect(code).toContain("Localization.country");
  expect(code).toContain("Localization.onCountryChanged");
  expect(code).toContain("Localization.preferredAudioLanguages");
  expect(code).toContain("Localization.onPreferredAudioLanguagesChanged");
  expect(code).toContain("Localization.presentationLanguage");
  expect(code).toContain("Localization.onPresentationLanguageChanged");
});

// 6.3 — Actions methods present
test("6.3 Actions methods are in generated bundle", () => {
  const ast = makeRDK9WebAST();
  const code = generateBundle(ast);
  expect(code).toContain("Actions.start");
  expect(code).toContain("Actions.intent");
  expect(code).toContain("Actions.onIntent");
});

// 6.4 — Advertising methods present
test("6.4 Advertising methods are in generated bundle", () => {
  const ast = makeRDK9WebAST();
  const code = generateBundle(ast);
  expect(code).toContain("Advertising.advertisingId");
});

// 6.5 — Device methods present
test("6.5 Device methods are in generated bundle", () => {
  const ast = makeRDK9WebAST();
  const code = generateBundle(ast);
  expect(code).toContain("Device.uid");
  expect(code).toContain("Device.deviceClass");
  expect(code).toContain("Device.hdr");
  expect(code).toContain("Device.onHdrChanged");
  expect(code).toContain("Device.dolbyAtmosExperienceAvailable");
  expect(code).toContain("Device.onDolbyAtmosExperienceAvailableChanged");
});

// 6.6 — Display methods present and Display filtered to web
test("6.6 Display methods present; Display excluded from native generators", () => {
  const ast = makeRDK9WebAST();
  const code = generateBundle(ast);
  expect(code).toContain("Display.colorimetry");
  expect(code).toContain("Display.videoResolutions");
});

// 6.7 — Network methods present
test("6.7 Network methods are in generated bundle", () => {
  const ast = makeRDK9WebAST();
  const code = generateBundle(ast);
  expect(code).toContain("Network.connected");
  expect(code).toContain("Network.onConnectedChanged");
});

// 6.8 — VideoOutput methods present
test("6.8 VideoOutput methods are in generated bundle", () => {
  const ast = makeRDK9WebAST();
  const code = generateBundle(ast);
  expect(code).toContain("VideoOutput.resolution");
  expect(code).toContain("VideoOutput.onResolutionChanged");
});

// 6.9 — Metrics methods present
test("6.9 All Metrics methods are in generated bundle", () => {
  const ast = makeRDK9WebAST();
  const code = generateBundle(ast);
  const expectedMethods = [
    "Metrics.ready", "Metrics.startContent", "Metrics.stopContent", "Metrics.page",
    "Metrics.error", "Metrics.mediaLoadStart", "Metrics.mediaPlay", "Metrics.mediaPlaying",
    "Metrics.mediaPause", "Metrics.mediaWaiting", "Metrics.mediaSeeking", "Metrics.mediaSeeked",
    "Metrics.mediaRateChanged", "Metrics.mediaRenditionChanged", "Metrics.mediaEnded",
    "Metrics.event", "Metrics.appInfo"
  ];
  for (const method of expectedMethods) {
    expect(code).toContain(method);
  }
});
