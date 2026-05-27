/**
 * Unit tests for the Canonical AST Builder.
 * Covers Rules 1, 2, 3, and 5.
 */

import { buildAST, deriveIdentifier, OpenRPCDocument } from "./builder";

// ---------------------------------------------------------------------------
// Minimal OpenRPC fixtures
// ---------------------------------------------------------------------------

const DISCOVERY_DOC: OpenRPCDocument = {
  openrpc: "1.2.4",
  info: { title: "Discovery", version: "9.0" },
  methods: [
    {
      name: "Discovery.watched",
      description: "Report a watched item",
      params: [
        { name: "entityId", required: true, schema: { type: "string" } },
        { name: "progress", required: false, schema: { type: "number", format: "double" } },
        { name: "completed", required: false, schema: { type: "boolean" } },
        { name: "watchedOn", required: false, schema: { type: "string", format: "date-time" } },
        { name: "agePolicy", required: false, schema: { $ref: "#/components/schemas/AgePolicy" } },
      ],
      result: { name: "result", schema: { type: "null" } },
    },
  ],
  components: {
    schemas: {
      AgePolicy: {
        title: "AgePolicy",
        type: "string",
        enum: ["app:adult", "app:child", "app:teen"],
      },
    },
  },
};

const LIFECYCLE2_DOC: OpenRPCDocument = {
  openrpc: "1.2.4",
  info: { title: "Lifecycle2", version: "9.0" },
  methods: [
    {
      name: "Lifecycle2.onStateChanged",
      description: "Subscribe to state changes",
      params: [
        { name: "listen", required: true, schema: { type: "boolean" } },
      ],
      result: {
        name: "result",
        schema: {
          oneOf: [
            { $ref: "shared.json#/components/schemas/ListenResponse" },
            { $ref: "#/components/schemas/StateChangedEvent" },
          ],
        },
      },
    },
  ],
  components: {
    schemas: {
      LifecycleState: {
        title: "LifecycleState",
        type: "string",
        enum: ["initializing", "paused", "active", "suspended", "hibernated", "terminating"],
      },
      StateChangedEvent: {
        title: "StateChangedEvent",
        type: "object",
        properties: {
          oldState: { $ref: "#/components/schemas/LifecycleState" },
          newState: { $ref: "#/components/schemas/LifecycleState" },
        },
        required: ["oldState", "newState"],
      },
    },
  },
};

// ---------------------------------------------------------------------------
// buildAST: basic shape
// ---------------------------------------------------------------------------

describe("buildAST", () => {
  test("returns version from first document", () => {
    const ast = buildAST([DISCOVERY_DOC]);
    expect(ast.version).toBe("9.0");
  });

  test("builds one module per document", () => {
    const ast = buildAST([DISCOVERY_DOC, LIFECYCLE2_DOC]);
    expect(ast.modules).toHaveLength(2);
    expect(ast.modules[0].name).toBe("Discovery");
    expect(ast.modules[1].name).toBe("Lifecycle2");
  });
});

// ---------------------------------------------------------------------------
// Rule 2: strip `listen` param
// ---------------------------------------------------------------------------

describe("Rule 2 — strip listen param", () => {
  const ast = buildAST([LIFECYCLE2_DOC]);
  const mod = ast.modules[0];
  const method = mod.methods[0];

  test("onStateChanged has kind subscribe", () => {
    expect(method.kind).toBe("subscribe");
  });

  test("onStateChanged has zero params after stripping listen", () => {
    expect(method.params).toHaveLength(0);
  });

  test("listen param is absent (negative test)", () => {
    const listenParam = method.params.find((p) => p.name === "listen");
    expect(listenParam).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Rule 2 negative: non-subscribe method keeps all params
// ---------------------------------------------------------------------------

describe("Rule 2 — call methods keep all params", () => {
  const ast = buildAST([DISCOVERY_DOC]);
  const method = ast.modules[0].methods[0];

  test("Discovery.watched has kind call", () => {
    expect(method.kind).toBe("call");
  });

  test("Discovery.watched has 5 params", () => {
    expect(method.params).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Rule 1: strip ListenResponse from oneOf
// ---------------------------------------------------------------------------

describe("Rule 1 — strip ListenResponse from subscribe result", () => {
  const ast = buildAST([LIFECYCLE2_DOC]);
  const method = ast.modules[0].methods[0];

  test("result is not null", () => {
    expect(method.result).not.toBeNull();
  });

  test("result is NamedRef to StateChangedEvent (not ListenResponse)", () => {
    expect(method.result).toEqual({ kind: "named", name: "StateChangedEvent" });
  });

  test("ListenResponse is absent from result (negative test)", () => {
    if (method.result !== null && method.result.kind === "named") {
      expect(method.result.name).not.toBe("ListenResponse");
    }
  });
});

// ---------------------------------------------------------------------------
// Rule 3: identifier derivation
// ---------------------------------------------------------------------------

describe("Rule 3 — deriveIdentifier", () => {
  test('"app:adult" → "AppAdult"', () => {
    expect(deriveIdentifier("app:adult")).toBe("AppAdult");
  });

  test('"app:child" → "AppChild"', () => {
    expect(deriveIdentifier("app:child")).toBe("AppChild");
  });

  test('"app:teen" → "AppTeen"', () => {
    expect(deriveIdentifier("app:teen")).toBe("AppTeen");
  });

  test('"dolbyDigital5.1" → "DolbyDigital51"', () => {
    expect(deriveIdentifier("dolbyDigital5.1")).toBe("DolbyDigital51");
  });

  test('"initializing" → "Initializing"', () => {
    expect(deriveIdentifier("initializing")).toBe("Initializing");
  });

  test('"app:adult" enum produces identifier "AppAdult" in AgePolicy', () => {
    const ast = buildAST([DISCOVERY_DOC]);
    const agePolicy = ast.modules[0].types.find(
      (t) => t.kind === "enum" && t.name === "AgePolicy"
    );
    expect(agePolicy).toBeDefined();
    if (agePolicy && agePolicy.kind === "enum") {
      const adult = agePolicy.values.find((v) => v.serializedId === "app:adult");
      expect(adult?.identifier).toBe("AppAdult");
    }
  });
});

// ---------------------------------------------------------------------------
// Rule 5: format propagation
// ---------------------------------------------------------------------------

describe("Rule 5 — format date-time propagation", () => {
  const ast = buildAST([DISCOVERY_DOC]);
  const method = ast.modules[0].methods[0];
  const watchedOn = method.params.find((p) => p.name === "watchedOn");

  test("watchedOn param exists", () => {
    expect(watchedOn).toBeDefined();
  });

  test("watchedOn type is OptionalRef wrapping a PrimitiveRef", () => {
    expect(watchedOn?.type.kind).toBe("optional");
    if (watchedOn?.type.kind === "optional") {
      expect(watchedOn.type.inner.kind).toBe("primitive");
    }
  });

  test("watchedOn inner PrimitiveRef has format: 'date-time'", () => {
    if (watchedOn?.type.kind === "optional" && watchedOn.type.inner.kind === "primitive") {
      expect(watchedOn.type.inner.format).toBe("date-time");
    }
  });
});

// ---------------------------------------------------------------------------
// Collision detection (Rule 3)
// ---------------------------------------------------------------------------

describe("Rule 3 — collision detection", () => {
  const collidingDoc: OpenRPCDocument = {
    openrpc: "1.2.4",
    info: { title: "Test", version: "1.0" },
    methods: [],
    components: {
      schemas: {
        BadEnum: {
          type: "string",
          enum: ["foo:bar", "foo_bar"], // both → "FooBar"
        },
      },
    },
  };

  test("throws on enum identifier collision", () => {
    expect(() => buildAST([collidingDoc])).toThrow(/duplicate derived identifier/i);
  });
});

// ---------------------------------------------------------------------------
// Error: empty documents
// ---------------------------------------------------------------------------

describe("buildAST error cases", () => {
  test("throws when called with no documents", () => {
    expect(() => buildAST([])).toThrow();
  });
});
