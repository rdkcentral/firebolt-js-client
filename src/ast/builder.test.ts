/**
 * Unit tests for the Canonical AST Builder.
 * Covers Rules 1, 2, 3, 5, and 7 (string + numeric constraints).
 */

import { buildAST, deriveIdentifier, OpenRPCDocument } from "./builder";

// ---------------------------------------------------------------------------
// Minimal OpenRPC fixtures
// ---------------------------------------------------------------------------

const DISCOVERY_DOC: OpenRPCDocument = {
  openrpc: "1.2.4",
  info: { title: "Discovery", version: "9.0", "x-firebolt-platform": "both" },
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
  info: { title: "Lifecycle2", version: "9.0", "x-firebolt-platform": "native" },
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
    info: { title: "Test", version: "1.0", "x-firebolt-platform": "web" },
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

  test("throws when x-firebolt-platform is missing", () => {
    const noPlatformDoc: OpenRPCDocument = {
      openrpc: "1.2.4",
      info: { title: "MissingPlatform", version: "9.0" },
      methods: [],
    };
    expect(() => buildAST([noPlatformDoc])).toThrow(/x-firebolt-platform/);
  });

  test("throws when x-firebolt-platform has an invalid value", () => {
    const badPlatformDoc: OpenRPCDocument = {
      openrpc: "1.2.4",
      info: { title: "BadPlatform", version: "9.0", "x-firebolt-platform": "mobile" },
      methods: [],
    };
    expect(() => buildAST([badPlatformDoc])).toThrow(/invalid/);
  });
});

// ---------------------------------------------------------------------------
// Platform classification
// ---------------------------------------------------------------------------

describe("Platform classification", () => {
  test("Discovery module has platform 'both'", () => {
    const ast = buildAST([DISCOVERY_DOC]);
    expect(ast.modules[0].platform).toBe("both");
  });

  test("Lifecycle2 module has platform 'native'", () => {
    const ast = buildAST([LIFECYCLE2_DOC]);
    expect(ast.modules[0].platform).toBe("native");
  });
});

// ---------------------------------------------------------------------------
// Rule 7: string constraint propagation
// ---------------------------------------------------------------------------

const LOCALIZATION_DOC: OpenRPCDocument = {
  openrpc: "1.2.4",
  info: { title: "Localization", version: "9.0", "x-firebolt-platform": "both" },
  methods: [
    {
      name: "Localization.onCountryChanged",
      description: "Fires when the country setting changes.",
      params: [
        { name: "listen", required: true, schema: { type: "boolean" } },
      ],
      result: {
        name: "result",
        schema: {
          oneOf: [
            { $ref: "shared.json#/components/schemas/ListenResponse" },
            {
              type: "string",
              minLength: 2,
              maxLength: 2,
              pattern: "^[A-Z]{2}$",
              description: "ISO 3166-1 alpha-2 country code",
            },
          ],
        },
      },
    },
    {
      name: "Localization.getUnconstrained",
      description: "Returns a plain string with no constraints.",
      params: [],
      result: {
        name: "result",
        schema: { type: "string" },
      },
    },
  ],
  components: { schemas: {} },
};

describe("Rule 7 — string constraint propagation", () => {
  const ast = buildAST([LOCALIZATION_DOC]);
  const mod = ast.modules[0];
  const onCountryChanged = mod.methods.find((m) => m.name === "onCountryChanged");
  const getUnconstrained  = mod.methods.find((m) => m.name === "getUnconstrained");

  test("onCountryChanged result is a PrimitiveRef string", () => {
    expect(onCountryChanged?.result?.kind).toBe("primitive");
    if (onCountryChanged?.result?.kind === "primitive") {
      expect(onCountryChanged.result.primitive).toBe("string");
    }
  });

  test("onCountryChanged result carries minLength=2", () => {
    if (onCountryChanged?.result?.kind === "primitive") {
      expect(onCountryChanged.result.constraints?.minLength).toBe(2);
    }
  });

  test("onCountryChanged result carries maxLength=2", () => {
    if (onCountryChanged?.result?.kind === "primitive") {
      expect(onCountryChanged.result.constraints?.maxLength).toBe(2);
    }
  });

  test("onCountryChanged result carries pattern=^[A-Z]{2}$", () => {
    if (onCountryChanged?.result?.kind === "primitive") {
      expect(onCountryChanged.result.constraints?.pattern).toBe("^[A-Z]{2}$");
    }
  });

  test("plain string result has no constraints property", () => {
    expect(getUnconstrained?.result?.kind).toBe("primitive");
    if (getUnconstrained?.result?.kind === "primitive") {
      expect(getUnconstrained.result.constraints).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Rule 7: numeric constraint propagation
// ---------------------------------------------------------------------------

const ACCESSIBILITY_DOC: OpenRPCDocument = {
  openrpc: "1.2.4",
  info: { title: "Accessibility", version: "9.0", "x-firebolt-platform": "both" },
  methods: [
    {
      name: "Accessibility.voiceGuidanceSettings",
      description: "Returns current voice guidance configuration.",
      params: [],
      result: {
        name: "result",
        schema: { $ref: "#/components/schemas/VoiceGuidanceSettings" },
      },
    },
  ],
  components: {
    schemas: {
      VoiceGuidanceSettings: {
        title: "VoiceGuidanceSettings",
        type: "object",
        description: "Voice guidance configuration.",
        properties: {
          enabled:         { type: "boolean" },
          rate:            { type: "number", format: "double", minimum: 0.1, maximum: 10 },
          navigationHints: { type: "boolean" },
        },
        required: ["enabled", "rate", "navigationHints"],
      },
    },
  },
};

describe("Rule 7 — numeric constraint propagation", () => {
  const ast = buildAST([ACCESSIBILITY_DOC]);
  const mod = ast.modules[0];
  const settings = mod.types.find((t) => t.name === "VoiceGuidanceSettings");
  const rateProp  = settings?.kind === "object"
    ? settings.properties.find((p) => p.name === "rate")
    : undefined;
  const enabledProp = settings?.kind === "object"
    ? settings.properties.find((p) => p.name === "enabled")
    : undefined;

  test("VoiceGuidanceSettings type is emitted", () => {
    expect(settings).toBeDefined();
    expect(settings?.kind).toBe("object");
  });

  test("rate property type is a double PrimitiveRef", () => {
    expect(rateProp?.type.kind).toBe("primitive");
    if (rateProp?.type.kind === "primitive") {
      expect(rateProp.type.primitive).toBe("double");
    }
  });

  test("rate property carries minimum=0.1", () => {
    if (rateProp?.type.kind === "primitive") {
      expect(rateProp.type.constraints?.minimum).toBeCloseTo(0.1);
    }
  });

  test("rate property carries maximum=10", () => {
    if (rateProp?.type.kind === "primitive") {
      expect(rateProp.type.constraints?.maximum).toBe(10);
    }
  });

  test("enabled property (bool) has no constraints", () => {
    expect(enabledProp?.type.kind).toBe("primitive");
    if (enabledProp?.type.kind === "primitive") {
      expect(enabledProp.type.constraints).toBeUndefined();
    }
  });

  test("voiceGuidanceSettings method result is NamedRef to VoiceGuidanceSettings", () => {
    const method = mod.methods[0];
    expect(method.result?.kind).toBe("named");
    if (method.result?.kind === "named") {
      expect(method.result.name).toBe("VoiceGuidanceSettings");
    }
  });
});
