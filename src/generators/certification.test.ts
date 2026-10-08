import * as fs from "fs";
import * as path from "path";
import { buildAST } from "../ast/builder";
import { CanonicalAST, Method, Module, TypeRef } from "../ast/types";
import { generateCertificationMethods } from "./certification";

function buildRealApiAST(): CanonicalAST {
  const openRpcDir = path.resolve(__dirname, "../openrpc");
  const documents = fs.readdirSync(openRpcDir)
    .filter((file) => file.endsWith(".json") && file !== "shared.json")
    .map((file) => JSON.parse(fs.readFileSync(path.join(openRpcDir, file), "utf8")));
  return buildAST(documents as never);
}

function call(name: string, params: Method["params"] = []): Method {
  return { name, kind: "call", params, result: null, description: "" };
}

function parameter(name: string, type: TypeRef): Method["params"][number] {
  return { name, type, description: "" };
}

const primitive = (kind: "bool" | "string" | "unsigned" | "double", constraints?: TypeRef extends never ? never : Record<string, number | string>) => ({
  kind: "primitive" as const,
  primitive: kind,
  ...(constraints ? { constraints } : {}),
});

function buildFixtureAST(): CanonicalAST {
  const module: Module = {
    name: "Fixture",
    platform: "both",
    types: [
      {
        kind: "enum",
        name: "Choice",
        values: [
          { serializedId: "first:value", identifier: "FirstValue", description: "" },
          { serializedId: "second", identifier: "Second", description: "" },
        ],
        description: "",
      },
      {
        kind: "object",
        name: "Payload",
        properties: [
          { name: "label", type: primitive("string"), required: true, description: "" },
          { name: "optionalLabel", type: { kind: "optional", inner: primitive("string") }, required: false, description: "" },
        ],
        description: "",
      },
    ],
    methods: [
      call("country", [parameter("country", primitive("string", { minLength: 2, maxLength: 2, pattern: "^[A-Z]{2}$" }))]),
      call("count", [parameter("count", primitive("unsigned", { minimum: 2, maximum: 5 }))]),
      call("choice", [parameter("choice", { kind: "named", name: "Choice" })]),
      call("payload", [parameter("payload", { kind: "named", name: "Payload" })]),
      call("flags", [parameter("flags", { kind: "array", items: primitive("bool") })]),
      call("raw", [parameter("raw", { kind: "generic-object" })]),
      call("unsupported", [parameter("code", primitive("string", { pattern: "^\\d{8}$" }))]),
      { name: "changed", kind: "subscribe", params: [], result: null, description: "" },
    ],
  };
  return { version: "9.0", modules: [module] };
}

describe("certification manifest generation", () => {
  test("matches every web API method and excludes native-only methods", () => {
    const ast = buildRealApiAST();
    const expected = ast.modules
      .filter((module) => module.platform !== "native")
      .flatMap((module) => module.methods
        .filter((method) => method.platform !== "native")
        .map((method) => `${module.name}.${method.name}`))
      .sort();
    const actual = generateCertificationMethods(ast).map((method) => method.name).sort();

    expect(actual).toEqual(expected);
    expect(actual).toContain("Device.brandName");
    expect(actual).toContain("VideoOutput.hdcp");
    expect(actual).not.toContain("Device.uptime");
    expect(actual).not.toContain("Metrics.signIn");
  });

  test("generates deterministic fixtures and omits optional object properties", () => {
    const methods = generateCertificationMethods(buildFixtureAST(), {
      "Fixture.unsupported": [{ code: "12345678" }],
    });
    const byName = Object.fromEntries(methods.map((method) => [method.name, method]));

    expect(byName["Fixture.country"].args).toEqual([{ country: "US" }]);
    expect(byName["Fixture.count"].args).toEqual([{ count: 2 }]);
    expect(byName["Fixture.choice"].args).toEqual([{ choice: "first:value" }]);
    expect(byName["Fixture.payload"].args).toEqual([{ payload: { label: "US" } }]);
    expect(byName["Fixture.flags"].args).toEqual([{ flags: [false] }]);
    expect(byName["Fixture.raw"].args).toEqual([{ raw: {} }]);
    expect(byName["Fixture.changed"].args).toEqual([]);
  });

  test("applies separate overrides and identifies methods with unsupported fixtures", () => {
    const ast = buildFixtureAST();
    const methods = generateCertificationMethods(ast, {
      "Fixture.unsupported": [{ code: "12345678" }],
    });
    expect(methods.find((method) => method.name === "Fixture.unsupported")?.args)
      .toEqual([{ code: "12345678" }]);

    expect(() => generateCertificationMethods(ast, {}))
      .toThrow("Unable to generate fixture for Fixture.unsupported");
  });
});