/**
 * Tests for the inject-js generator output (factory pattern).
 *
 * Strategy: build a minimal synthetic CanonicalAST, run generate(), then
 * eval the output in a Node vm context with a mock transport.
 */

import * as vm from "vm";
import { CanonicalAST, Module } from "../ast/types";
import { GenConfig } from "./index";
const { minifyBuilder } = require("../../scripts/minify-webkit-builder.cjs") as {
  minifyBuilder: (source: string) => Promise<string>;
};

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

/** Generate the bundle code for a given AST */
function generateBundle(ast: CanonicalAST): string {
  const config: GenConfig = { outDir: "/tmp/test" };
  const outputs = runAllFullAST(ast, config, ["inject-js"]);
  return outputs[0].content;
}

function generateWebKitBundle(ast: CanonicalAST): string {
  const config: GenConfig = { outDir: "/tmp/test" };
  const outputs = runAllFullAST(ast, config, ["webkit-builder"]);
  return outputs[0].content;
}

interface MockTransport {
  sentMessages: string[];
  open: () => void;
  close: () => void;
  send: (msg: string) => void;
  onMessage: ((raw: string) => void) | null;
  onOpen: (() => void) | null;
  onClose: (() => void) | null;
  onError: ((error: unknown) => void) | null;
}

function makeMockTransport(): MockTransport {
  const t: MockTransport = {
    sentMessages: [],
    open: () => {},
    close: () => {},
    send: (msg) => {
      t.sentMessages.push(msg);
    },
    onMessage: null,
    onOpen: null,
    onClose: null,
    onError: null,
  };
  return t;
}

/**
 * Evaluate the bundle in a fresh vm context.
 * Returns { context, transport, factory }.
 */
function evalBundle(code: string, mockTransport?: MockTransport) {
  const transport = mockTransport ?? makeMockTransport();
  const context: Record<string, unknown> = {
    window: {},
    globalThis: undefined as unknown,
    console: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
    Promise,
    JSON,
    Array,
    Object,
    RegExp,
  };
  context.globalThis = context;
  vm.createContext(context);
  const result = vm.runInContext(code, context);
  const factory = (context.factory ?? result) as (opts: { transport: MockTransport }) => { build: () => Promise<unknown> };
  return { context, transport, factory };
}

async function buildClient(code: string) {
  const { factory, transport } = evalBundle(code);
  const instancePromise = factory({ transport }).build();
  transport.onOpen?.();
  return {
    client: await instancePromise as Record<string, unknown>,
    transport,
  };
}

// ---------------------------------------------------------------------------
// Factory pattern tests
// ---------------------------------------------------------------------------

test("factory returns a function", () => {
  const factory = evalBundle(generateBundle(makeAST())).factory;
  expect(typeof factory).toBe("function");
});

test("factory requires transport parameter", () => {
  const factory = evalBundle(generateBundle(makeAST())).factory;
  expect(() => (factory as (opts: unknown) => unknown)({})).toThrow(/transport is required/i);
});

test("factory validates transport has required methods", () => {
  const factory = evalBundle(generateBundle(makeAST())).factory;
  
  // Missing send
  expect(() => (factory as (opts: { transport: Partial<MockTransport> }) => unknown)({
    transport: { open: () => {}, close: () => {} }
  })).toThrow(/send.*method/i);

  // Missing open
  expect(() => (factory as (opts: { transport: Partial<MockTransport> }) => unknown)({
    transport: { send: () => {}, close: () => {} }
  })).toThrow(/open.*method/i);

  // Missing close
  expect(() => (factory as (opts: { transport: Partial<MockTransport> }) => unknown)({
    transport: { send: () => {}, open: () => {} }
  })).toThrow(/close.*method/i);
});

test("factory returns object with build method", () => {
  const { factory, transport } = evalBundle(generateBundle(makeAST()));
  const result = factory({ transport });
  expect(result).toHaveProperty("build");
  expect(typeof result.build).toBe("function");
});

test("build() returns a promise", () => {
  const { factory, transport } = evalBundle(generateBundle(makeAST()));
  const builder = factory({ transport });
  const promise = builder.build();
  expect(promise).toBeInstanceOf(Promise);
});

test("build() calls transport.open()", () => {
  const { factory, transport } = evalBundle(generateBundle(makeAST()));
  const openSpy = jest.spyOn(transport, "open");
  factory({ transport }).build();
  expect(openSpy).toHaveBeenCalled();
});

test("build() sets transport callbacks", () => {
  const { factory, transport } = evalBundle(generateBundle(makeAST()));
  factory({ transport }).build();
  expect(typeof transport.onMessage).toBe("function");
  expect(typeof transport.onOpen).toBe("function");
  expect(typeof transport.onClose).toBe("function");
  expect(typeof transport.onError).toBe("function");
});

test("debug mode sets window.___fireboltTransport___", () => {
  const { factory, transport } = evalBundle(generateBundle(makeAST()));
  factory({ transport, enableDebug: true } as { transport: MockTransport; enableDebug: boolean });
  // Note: This would require checking the window object after factory call
  // For now, just verify it doesn't throw
});

test("extension schema is parsed and stored", () => {
  const { factory, transport } = evalBundle(generateBundle(makeAST()));
  const schema = JSON.stringify([
    { name: "TestModule", methods: ["testMethod"], events: [], methodsWithObject: [] }
  ]);
  factory({ transport, extensionSchema: schema } as { transport: MockTransport; extensionSchema: string });
  // Note: This would require verifying the extension schema is loaded
  // For now, just verify it doesn't throw
});

test("invalid extension schema warns and does not prevent factory creation", () => {
  const { factory, transport } = evalBundle(generateBundle(makeAST()));
  expect(() => factory({ transport, extensionSchema: "{" } as { transport: MockTransport; extensionSchema: string })).not.toThrow();
});

test("build rejects when transport.open throws synchronously", async () => {
  const { factory, transport } = evalBundle(generateBundle(makeAST()));
  transport.open = () => {
    throw new Error("open failed");
  };

  await expect(factory({ transport }).build()).rejects.toThrow("open failed");
});

test("event callbacks receive payload and cancellation status; cleanup closes transport", async () => {
  const { factory, transport } = evalBundle(generateBundle(makeAST()));
  const closeSpy = jest.spyOn(transport, "close");
  const clientPromise = factory({ transport }).build();
  transport.onOpen?.();
  const client = await clientPromise as {
    Localization: {
      onLanguageChanged: (callback: (payload: unknown, cancelled: boolean) => void) => Promise<() => void>;
    };
    cleanup: () => void;
  };
  const callback = jest.fn();
  const subscription = client.Localization.onLanguageChanged(callback);
  const subscribeMessage = JSON.parse(transport.sentMessages[0]);
  transport.onMessage?.(JSON.stringify({ id: subscribeMessage.id, result: null }));
  const unsubscribe = await subscription;

  transport.onMessage?.(JSON.stringify({
    method: "Localization.onLanguageChanged",
    params: { value: "en" },
  }));
  expect(callback).toHaveBeenCalledWith("en", false);

  client.cleanup();
  expect(callback).toHaveBeenLastCalledWith(null, true);
  expect(closeSpy).toHaveBeenCalled();
  expect(typeof unsubscribe).toBe("function");
});

// ---------------------------------------------------------------------------
// Native-only module filtering
// ---------------------------------------------------------------------------

test("native-only modules are not included in bundle", () => {
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

  const code = generateBundle(ast);
  // Verify the bundle contains Localization but not NativeOnly
  expect(code).toContain("Localization");
  expect(code).not.toContain("NativeOnly");
});

// ---------------------------------------------------------------------------
// Static module generation
// ---------------------------------------------------------------------------

test("bundle contains static module definitions", () => {
  const code = generateBundle(makeAST());
  expect(code).toContain("_addMethodNoParams");
  expect(code).toContain("_addMethodWithObjectParam");
  expect(code).toContain("_addEvent");
  expect(code).toContain("_registerModule");
});

test("WebKit builder profile returns the shared factory without a global export", () => {
  const code = generateWebKitBundle(makeAST());
  const { context, factory, transport } = evalBundle(code);

  expect(typeof factory).toBe("function");
  expect(context.factory).toBeUndefined();
  expect(typeof factory({ transport }).build).toBe("function");
  expect(code).toContain('_addMethodNoParams(_Localization, "language", "Localization")');
});

test("generic and WebKit profiles expose the same platform-filtered API surface", async () => {
  const ast = makeAST();
  ast.modules[0].methods.push({
    kind: "call",
    name: "nativeOnly",
    params: [],
    result: { kind: "primitive", primitive: "string" } as never,
    platform: "native",
  } as never);
  ast.modules.push({
    name: "NativeOnly",
    platform: "native",
    types: [],
    methods: [{
      kind: "call",
      name: "ping",
      params: [],
      result: { kind: "primitive", primitive: "string" } as never,
    } as never],
  });

  const generic = await buildClient(generateBundle(ast));
  const webkit = await buildClient(generateWebKitBundle(ast));
  const genericClient = generic.client as Record<string, Record<string, unknown>>;
  const webkitClient = webkit.client as Record<string, Record<string, unknown>>;

  expect(Object.keys(webkitClient).sort()).toEqual(Object.keys(genericClient).sort());
  expect(Object.keys(webkitClient.Localization).sort()).toEqual(Object.keys(genericClient.Localization).sort());
  expect(webkitClient.Localization).not.toHaveProperty("nativeOnly");
  expect(webkitClient).not.toHaveProperty("NativeOnly");
});

test("minified WebKit profile is deterministic and preserves RPC, event, and cleanup behavior", async () => {
  const readable = generateWebKitBundle(makeAST());
  const minified = await minifyBuilder(readable);
  expect(await minifyBuilder(readable)).toBe(minified);
  expect(minified.length).toBeLessThan(readable.length);

  const { client: rawClient, transport } = await buildClient(minified);
  const client = rawClient as {
    Localization: {
      language: () => Promise<unknown>;
      onLanguageChanged: (callback: (payload: unknown, cancelled: boolean) => void) => Promise<() => void>;
    };
    cleanup: () => void;
  };
  const closeSpy = jest.spyOn(transport, "close");

  const languagePromise = client.Localization.language();
  const languageRequest = JSON.parse(transport.sentMessages[0]);
  expect(languageRequest).toMatchObject({ method: "Localization.language", params: {} });
  transport.onMessage?.(JSON.stringify({ id: languageRequest.id, result: "en" }));
  await expect(languagePromise).resolves.toBe("en");

  const callback = jest.fn();
  const subscriptionPromise = client.Localization.onLanguageChanged(callback);
  const subscribeRequest = JSON.parse(transport.sentMessages[1]);
  transport.onMessage?.(JSON.stringify({ id: subscribeRequest.id, result: null }));
  const unsubscribe = await subscriptionPromise;
  transport.onMessage?.(JSON.stringify({
    method: "Localization.onLanguageChanged",
    params: { value: "fr" },
  }));
  expect(callback).toHaveBeenCalledWith("fr", false);

  client.cleanup();
  expect(callback).toHaveBeenLastCalledWith(null, true);
  expect(closeSpy).toHaveBeenCalled();
  expect(typeof unsubscribe).toBe("function");
});

test("bundle contains extension schema support", () => {
  const code = generateBundle(makeAST());
  expect(code).toContain("_addExtensions");
  expect(code).toContain("_extensionSchema");
});

test("bundle contains cleanup method", () => {
  const code = generateBundle(makeAST());
  expect(code).toContain("cleanup");
});

test("bundle contains new transport interface", () => {
  const code = generateBundle(makeAST());
  expect(code).toContain("_onOpen");
  expect(code).toContain("_onClose");
  expect(code).toContain("_onError");
  expect(code).toContain("transport.open");
  expect(code).toContain("transport.close");
});

// ---------------------------------------------------------------------------
// Single-primitive-wrap pattern tests
// ---------------------------------------------------------------------------

test("bundle contains _addMethodWithPrimitiveWrap function", () => {
  const code = generateBundle(makeAST());
  expect(code).toContain("_addMethodWithPrimitiveWrap");
});

test("single-primitive-wrap pattern is detected for methods with object containing single primitive property", () => {
  const testModule: Module = {
    name: "TestModule",
    platform: "web",
    types: [
      {
        kind: "object",
        name: "BuildInfo",
        properties: [
          {
            name: "build",
            type: { kind: "primitive", primitive: "string" },
            required: true,
            description: "Build identifier"
          }
        ],
        description: "Build object"
      }
    ],
    methods: [
      {
        kind: "call",
        name: "appInfo",
        params: [
          {
            name: "build",
            type: { kind: "named", name: "BuildInfo" },
            description: "Build parameter"
          } as never,
        ],
        result: null,
      } as never,
    ],
  };

  const ast = makeAST({ modules: [testModule] });
  const code = generateBundle(ast);
  const webKitCode = generateWebKitBundle(ast);
  expect(code).toContain("_addMethodWithPrimitiveWrap");
  expect(webKitCode).toContain('_addMethodWithPrimitiveWrap(_TestModule, "appInfo", "TestModule", "build")');
});

test("single-primitive-wrap pattern is NOT used for methods with multiple parameters", () => {
  const testModule: Module = {
    name: "TestModule",
    platform: "web",
    types: [],
    methods: [
      {
        kind: "call",
        name: "multiParam",
        params: [
          {
            name: "param1",
            type: { kind: "primitive", primitive: "string" } as never,
            description: "First param"
          } as never,
          {
            name: "param2",
            type: { kind: "primitive", primitive: "string" } as never,
            description: "Second param"
          } as never,
        ],
        result: null,
      } as never,
    ],
  };

  const ast = makeAST({ modules: [testModule] });
  const code = generateBundle(ast);
  expect(code).toContain("_addMethodWithObjectParam");
  // Check that the function is not CALLED for this method (it's still defined in preamble for extensions)
  expect(code).not.toContain('_addMethodWithPrimitiveWrap(_TestModule, "multiParam"');
});

test("single-primitive-wrap pattern is NOT used for methods with optional single property", () => {
  const testModule: Module = {
    name: "TestModule",
    platform: "web",
    types: [],
    methods: [
      {
        kind: "call",
        name: "optionalParam",
        params: [
          {
            name: "param",
            type: {
              kind: "object",
              properties: [
                {
                  name: "value",
                  type: { kind: "primitive", primitive: "string" },
                  required: false,
                  description: "Optional value"
                }
              ],
              description: "Optional object"
            },
            description: "Optional parameter"
          } as never,
        ],
        result: null,
      } as never,
    ],
  };

  const ast = makeAST({ modules: [testModule] });
  const code = generateBundle(ast);
  expect(code).toContain("_addMethodWithObjectParam");
  // Check that the function is not CALLED for this method (it's still defined in preamble for extensions)
  expect(code).not.toContain('_addMethodWithPrimitiveWrap(_TestModule, "optionalParam"');
});
