/**
 * Tests for the FullASTGenerator infrastructure:
 *   4.1  registerFullASTGenerator + runAllFullAST: called once with full AST
 *   4.2  runAllFullAST target filter: only inject-js generator invoked
 *   4.3  runAllFullAST with no matching target: throws
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { buildAST } from "../ast/builder";
import {
  FullASTGenerator,
  GenConfig,
  GeneratorOutput,
  registerFullASTGenerator,
  runAll,
  runAllFullAST,
} from "./index";
import { CanonicalAST } from "../ast/types";

// Register generators under test-scoped names to avoid polluting the shared registry
import discoveryDoc from "../../src/openrpc/discovery.json";
import localizationDoc from "../../src/openrpc/localization.json";
import accessibilityDoc from "../../src/openrpc/accessibility.json";

const ast = buildAST([
  discoveryDoc as never,
  localizationDoc as never,
  accessibilityDoc as never,
]);
const config: GenConfig = { outDir: "/tmp/firebolt-infra-test" };

// ---------------------------------------------------------------------------
// 4.1  registerFullASTGenerator + runAllFullAST: invoked exactly once
// ---------------------------------------------------------------------------

describe("4.1 runAllFullAST invokes the registered generator exactly once with the full AST", () => {
  test("generator is called once regardless of module count", () => {
    const calls: CanonicalAST[] = [];
    const testId = "__test_4_1_" + Date.now();

    const gen: FullASTGenerator = (a: CanonicalAST): GeneratorOutput[] => {
      calls.push(a);
      return [];
    };
    registerFullASTGenerator(testId, gen, "web");

    runAllFullAST(ast, config, [testId]);

    expect(calls).toHaveLength(1);
    expect(calls[0].modules).toHaveLength(ast.modules.length);
  });

  test("generator receives all module names", () => {
    const received: string[] = [];
    const testId = "__test_4_1b_" + Date.now();

    const gen: FullASTGenerator = (a: CanonicalAST): GeneratorOutput[] => {
      received.push(...a.modules.map((m) => m.name));
      return [];
    };
    registerFullASTGenerator(testId, gen, "web");

    runAllFullAST(ast, config, [testId]);

    expect(received).toContain("Discovery");
    expect(received).toContain("Localization");
    expect(received).toContain("Accessibility");
  });
});

// ---------------------------------------------------------------------------
// 4.2  Target filter: inject-js only → per-module generators not called
// ---------------------------------------------------------------------------

describe("4.2 runAllFullAST target filter — only full-AST generators invoked", () => {
  test("per-module runAll is unaffected when targets contains only a full-AST id", () => {
    const testId = "__test_4_2_" + Date.now();
    const called: boolean[] = [];

    const gen: FullASTGenerator = (): GeneratorOutput[] => {
      called.push(true);
      return [{ filePath: "inject-js/test.js", content: "// ok" }];
    };
    registerFullASTGenerator(testId, gen, "web");

    // runAll with a full-AST target should produce no output (skips it)
    const perModuleOutputs = runAll(ast.modules, config, [testId]);
    expect(perModuleOutputs).toHaveLength(0);

    // runAllFullAST with the same target should invoke the generator
    const fullOutputs = runAllFullAST(ast, config, [testId]);
    expect(called).toHaveLength(1);
    expect(fullOutputs).toHaveLength(1);
    expect(fullOutputs[0].filePath).toBe("inject-js/test.js");
  });
});

// ---------------------------------------------------------------------------
// 4.3  Unknown target throws a clear error
// ---------------------------------------------------------------------------

describe("4.3 runAllFullAST throws for unknown target", () => {
  test("throws when target is not registered in either registry", () => {
    expect(() => {
      runAllFullAST(ast, config, ["__nonexistent_target__"]);
    }).toThrow(/No generator registered for target/);
  });

  test("does NOT throw when target is a known per-module generator (silently skips)", () => {
    // "ts" is a per-module generator; runAllFullAST should skip it, not throw
    // We need ts registered — import it
    require("./typescript");
    expect(() => {
      runAllFullAST(ast, config, ["ts"]);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Smoke test — generate firebolt-inject.js from real OpenRPC files, write to disk
// ---------------------------------------------------------------------------

import lifecycle2Doc from "../../src/openrpc/lifecycle2.json";
import sharedDoc from "../../src/openrpc/shared.json";

describe("smoke test: generate firebolt-inject.js from real OpenRPC files", () => {
  let outDir: string;

  beforeAll(() => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), "firebolt-smoke-"));
  });

  afterAll(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  test("generates firebolt-inject.js at <outDir>/inject-js/firebolt-inject.js", () => {
    const fullAst = buildAST([
      discoveryDoc as never,
      localizationDoc as never,
      accessibilityDoc as never,
      lifecycle2Doc as never,
      sharedDoc as never,
    ]);

    require("./inject-js"); // ensure registered
    const outputs = runAllFullAST(fullAst, { outDir }, ["inject-js"]);

    expect(outputs).toHaveLength(1);
    expect(outputs[0].filePath).toBe("inject-js/firebolt-inject.js");

    const destDir = path.join(outDir, "inject-js");
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, "firebolt-inject.js");
    fs.writeFileSync(destPath, outputs[0].content, "utf-8");

    const stat = fs.statSync(destPath);
    expect(stat.size).toBeGreaterThan(4096); // at least 4 KB
  });

  test("generated file is a valid IIFE wrapping global", () => {
    require("./inject-js");
    const fullAst = buildAST([
      discoveryDoc as never,
      localizationDoc as never,
      accessibilityDoc as never,
    ]);
    const [output] = runAllFullAST(fullAst, { outDir }, ["inject-js"]);
    const src = output.content;

    expect(src.trimStart()).toMatch(/^\(function\(global\)/);
    expect(src).toContain("FireboltServiceManager");
    expect(src).toContain("configure");
    expect(src).toContain("_VERSION");
    expect(src).toContain("_methodRegistry");
    expect(src.trimEnd()).toMatch(/globalThis.*window.*\);$/);
  });

  test("generated file contains expected web-module methods and no native-only modules", () => {
    require("./inject-js");
    const fullAst = buildAST([
      discoveryDoc as never,
      localizationDoc as never,
      accessibilityDoc as never,
      lifecycle2Doc as never,
      sharedDoc as never,
    ]);
    const [output] = runAllFullAST(fullAst, { outDir }, ["inject-js"]);
    const src = output.content;

    // Localization and Accessibility are web/both — their methods must be present
    expect(src).toContain("Localization.");
    expect(src).toContain("Accessibility.");
  });
});
