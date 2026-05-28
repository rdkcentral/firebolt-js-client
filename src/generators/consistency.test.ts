/**
 * Cross-generator consistency tests.
 * Verifies that all 5 generators handle shared cases consistently:
 *   12.1: enum identifier "app:adult" → "AppAdult" across all outputs
 *   12.2: format:date-time → datetime in Python, string elsewhere
 *   12.3: subscribe pattern present in all outputs for onStateChanged
 *   12.4: platform filtering — Discovery (both) in all 5 targets
 *   12.5: string constraints — onCountryChanged constraint notes in all targets
 *   12.6: numeric constraints — rate property in VoiceGuidanceSettings
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
import localizationDoc from "../../src/openrpc/localization.json";
import accessibilityDoc from "../../src/openrpc/accessibility.json";

const ast = buildAST([
  discoveryDoc as never,
  lifecycle2Doc as never,
  localizationDoc as never,
  accessibilityDoc as never,
]);
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

// Helper: assert output is absent by path fragment
function expectNoOutput(pathFragment: string): void {
  const hit = outputs.find((o) => o.filePath.includes(pathFragment));
  if (hit) throw new Error(`Expected no output matching "${pathFragment}" but found: ${hit.filePath}`);
}

// ---------------------------------------------------------------------------
// 12.3: subscribe pattern for onStateChanged — native targets only
// ---------------------------------------------------------------------------

describe("12.3 Subscribe pattern — Lifecycle2 native targets only", () => {
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

  // Negative: web generators must NOT emit Lifecycle2 output
  test("TypeScript: NO Lifecycle2.d.ts emitted (Lifecycle2 is native-only)", () => {
    expectNoOutput("ts/Lifecycle2.d.ts");
  });

  test("ReScript: NO Lifecycle2.res emitted (Lifecycle2 is native-only)", () => {
    expectNoOutput("res/Lifecycle2.res");
  });

  test("Kotlin: NO Lifecycle2.kt emitted (Lifecycle2 is native-only)", () => {
    expectNoOutput("kt/Lifecycle2.kt");
  });
});

// ---------------------------------------------------------------------------
// 12.5: String constraints — onCountryChanged annotations in all targets
// ---------------------------------------------------------------------------

describe("12.5 String constraints — onCountryChanged constraint notes in all targets", () => {
  test("TypeScript: constraint note in Localization.d.ts", () => {
    const ts = getOutput("ts/Localization.d.ts");
    expect(ts).toContain("minLength=2");
    expect(ts).toContain("maxLength=2");
    expect(ts).toContain("pattern=^[A-Z]{2}$");
  });

  test("ReScript: constraint comment in Localization.res", () => {
    const res = getOutput("res/Localization.res");
    expect(res).toContain("minLength=2");
    expect(res).toContain("maxLength=2");
    expect(res).toContain("pattern=^[A-Z]{2}$");
  });

  test("Kotlin: constraint KDoc in Localization.kt", () => {
    const kt = getOutput("kt/Localization.kt");
    expect(kt).toContain("minLength=2");
    expect(kt).toContain("maxLength=2");
    expect(kt).toContain("pattern=^[A-Z]{2}$");
  });

  test("C++: constraint comment in Localization.hpp", () => {
    const cpp = getOutput("cpp/firebolt/Localization.hpp");
    expect(cpp).toContain("minLength=2");
    expect(cpp).toContain("maxLength=2");
    expect(cpp).toContain("pattern=^[A-Z]{2}$");
  });

  test("Python .pyi: Annotated[str, ...] for constrained string", () => {
    const pyi = getOutput("localization.pyi");
    expect(pyi).toContain("Annotated[str,");
    expect(pyi).toContain("minLength=2");
    expect(pyi).toContain("maxLength=2");
    expect(pyi).toContain("pattern=^[A-Z]{2}$");
  });

  test("Python .pyi: Annotated import present", () => {
    const pyi = getOutput("localization.pyi");
    expect(pyi).toContain("from typing import Annotated");
  });
});

describe("12.4 Platform filtering — Discovery (platform: both) in all 5 targets", () => {
  test("TypeScript: Discovery.d.ts exists", () => {
    expect(getOutput("ts/Discovery.d.ts")).toBeTruthy();
  });

  test("ReScript: Discovery.res exists", () => {
    expect(getOutput("res/Discovery.res")).toBeTruthy();
  });

  test("Kotlin: Discovery.kt exists", () => {
    expect(getOutput("kt/Discovery.kt")).toBeTruthy();
  });

  test("C++: Discovery.hpp exists", () => {
    expect(getOutput("cpp/firebolt/Discovery.hpp")).toBeTruthy();
  });

  test("Python: discovery.pyi exists", () => {
    expect(getOutput("discovery.pyi")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 12.6: Numeric constraints — VoiceGuidanceSettings.rate in all 5 targets
// ---------------------------------------------------------------------------

describe("12.6 Numeric constraints — rate property in VoiceGuidanceSettings", () => {
  test("TypeScript: JSDoc constraint on rate property in Accessibility.d.ts", () => {
    const ts = getOutput("ts/Accessibility.d.ts");
    expect(ts).toContain("minimum=0.1");
    expect(ts).toContain("maximum=10");
  });

  test("TypeScript: rate is number type", () => {
    const ts = getOutput("ts/Accessibility.d.ts");
    expect(ts).toContain("rate: number");
  });

  test("ReScript: inline constraint comment on rate in Accessibility.res", () => {
    const res = getOutput("res/Accessibility.res");
    expect(res).toContain("minimum=0.1");
    expect(res).toContain("maximum=10");
  });

  test("Kotlin: inline constraint comment on rate in Accessibility.kt", () => {
    const kt = getOutput("kt/Accessibility.kt");
    expect(kt).toContain("minimum=0.1");
    expect(kt).toContain("maximum=10");
  });

  test("C++: inline constraint comment on rate in Accessibility.hpp", () => {
    const cpp = getOutput("cpp/firebolt/Accessibility.hpp");
    expect(cpp).toContain("minimum=0.1");
    expect(cpp).toContain("maximum=10");
  });

  test("Python .pyi: Annotated[float, ...] for constrained rate", () => {
    const pyi = getOutput("accessibility.pyi");
    expect(pyi).toContain("Annotated[float,");
    expect(pyi).toContain("minimum=0.1");
    expect(pyi).toContain("maximum=10");
  });

  test("Python .pyi: Annotated import present for accessibility", () => {
    const pyi = getOutput("accessibility.pyi");
    expect(pyi).toContain("from typing import Annotated");
  });
});
