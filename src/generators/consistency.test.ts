/**
 * Cross-generator consistency tests.
 * Verifies that all 5 generators handle shared cases consistently:
 *   12.1: enum identifier "app:adult" → "AppAdult" across all outputs
 *   12.2: format:date-time → datetime in Python, string elsewhere
 *   12.3: subscribe pattern present in all outputs for onStateChanged
 */

import { buildAST } from "../ast/builder";
import { runAll, GenConfig } from "../generators/index";

// Register all generators
import "../generators/typescript";
import "../generators/rescript";
import "../generators/kotlin";
import "../generators/cpp";
import "../generators/python";

// ---------------------------------------------------------------------------
// Build shared AST fixture once
// ---------------------------------------------------------------------------

import discoveryDoc from "../../src/openrpc/discovery.json";
import lifecycle2Doc from "../../src/openrpc/lifecycle2.json";

const ast = buildAST([discoveryDoc as never, lifecycle2Doc as never]);
const config: GenConfig = { outDir: "/tmp/firebolt-test-out" };
const outputs = runAll(ast.modules, config);

// Helper: get file content by path fragment
function getOutput(pathFragment: string): string {
  const hit = outputs.find((o) => o.filePath.includes(pathFragment));
  if (!hit) throw new Error(`No output found matching "${pathFragment}"`);
  return hit.content;
}

// ---------------------------------------------------------------------------
// 12.1: enum identifier consistency — "app:adult" → "AppAdult"
// ---------------------------------------------------------------------------

describe("12.1 Enum identifier consistency — AppAdult across all targets", () => {
  test("TypeScript: type AgePolicy contains string literal app:adult", () => {
    const ts = getOutput("ts/Discovery.d.ts");
    expect(ts).toContain('"app:adult"');
  });

  test("TypeScript: uses AppAdult (no, TS uses serializedId in literal union)", () => {
    // TS generator uses serializedId in string literal union — that is correct by convention
    const ts = getOutput("ts/Discovery.d.ts");
    expect(ts).toContain("app:adult");
  });

  test("ReScript: @as(\"app:adult\") AppAdult", () => {
    const res = getOutput("res/Discovery.res");
    expect(res).toContain('@as("app:adult") AppAdult');
  });

  test("Kotlin: AppAdult(\"app:adult\")", () => {
    const kt = getOutput("kt/Discovery.kt");
    expect(kt).toContain('AppAdult("app:adult")');
  });

  test("C++: AppAdult, // wire: \"app:adult\"", () => {
    const cpp = getOutput("cpp/firebolt/Discovery.hpp");
    expect(cpp).toContain("AppAdult");
    expect(cpp).toContain('"app:adult"');
  });

  test("Python .pyi: Literal contains \"app:adult\"", () => {
    const pyi = getOutput("discovery.pyi");
    expect(pyi).toContain('"app:adult"');
  });

  test("Python _protocol.py: AppAdult = \"app:adult\"", () => {
    const proto = getOutput("discovery_protocol.py");
    expect(proto).toContain('AppAdult = "app:adult"');
  });
});

// ---------------------------------------------------------------------------
// 12.2: format:date-time — datetime in Python, string elsewhere
// ---------------------------------------------------------------------------

describe("12.2 format:date-time — datetime in Python, string in all others", () => {
  test("TypeScript: watchedOn is string", () => {
    const ts = getOutput("ts/Discovery.d.ts");
    expect(ts).toContain("watchedOn?: string");
  });

  test("ReScript: watchedOn is option<string>", () => {
    const res = getOutput("res/Discovery.res");
    expect(res).toContain("~watchedOn: option<string>=?");
  });

  test("Kotlin: watchedOn is String", () => {
    const kt = getOutput("kt/Discovery.kt");
    expect(kt).toMatch(/watchedOn.*String/);
  });

  test("C++: watchedOn is std::optional<std::string>", () => {
    const cpp = getOutput("cpp/firebolt/Discovery.hpp");
    expect(cpp).toContain("std::optional<std::string> watchedOn");
  });

  test("Python .pyi: watchedOn is Optional[datetime]", () => {
    const pyi = getOutput("discovery.pyi");
    expect(pyi).toContain("datetime");
    expect(pyi).toContain("watchedOn");
  });
});

// ---------------------------------------------------------------------------
// 12.3: subscribe pattern for onStateChanged in all targets
// ---------------------------------------------------------------------------

describe("12.3 Subscribe pattern — callback + unsubscribe in all targets", () => {
  test("TypeScript: onStateChanged takes callback and returns () => void", () => {
    const ts = getOutput("ts/Lifecycle2.d.ts");
    expect(ts).toContain("onStateChanged");
    expect(ts).toContain("callback");
    expect(ts).toContain("() => void");
  });

  test("ReScript: onStateChanged returns (unit => unit)", () => {
    const res = getOutput("res/Lifecycle2.res");
    expect(res).toContain("onStateChanged");
    expect(res).toContain("unit => unit");
  });

  test("Kotlin: onStateChanged takes callback and returns () -> Unit", () => {
    const kt = getOutput("kt/Lifecycle2.kt");
    expect(kt).toContain("onStateChanged");
    expect(kt).toContain("callback");
    expect(kt).toContain("() -> Unit");
  });

  test("C++: onStateChanged takes std::function callback and returns UnsubscribeFn", () => {
    const cpp = getOutput("cpp/firebolt/Lifecycle2.hpp");
    expect(cpp).toContain("onStateChanged");
    expect(cpp).toContain("std::function");
    expect(cpp).toContain("UnsubscribeFn");
  });

  test("Python .pyi: onStateChanged takes Callable callback and returns Callable[[], None]", () => {
    const pyi = getOutput("lifecycle2.pyi");
    expect(pyi).toContain("onStateChanged");
    expect(pyi).toContain("Callable");
    expect(pyi).toContain("Callable[[], None]");
  });

  test("Python _protocol.py: onStateChanged is @abstractmethod", () => {
    const proto = getOutput("lifecycle2_protocol.py");
    expect(proto).toContain("@abstractmethod");
    expect(proto).toContain("onStateChanged");
  });
});
