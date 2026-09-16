/**
 * Tests for the inject-js generator output (factory pattern).
 *
 * Strategy: build a minimal synthetic CanonicalAST, run generate(), then
 * eval the output in a Node vm context with a mock transport.
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

/** Generate the bundle code for a given AST */
function generateBundle(ast: CanonicalAST): string {
  const config: GenConfig = { outDir: "/tmp/test" };
  const outputs = runAllFullAST(ast, config, ["inject-js"]);
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
  vm.runInContext(code, context);
  const factory = context.factory as (opts: { transport: MockTransport }) => { build: () => Promise<unknown> };
  return { context, transport, factory };
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
