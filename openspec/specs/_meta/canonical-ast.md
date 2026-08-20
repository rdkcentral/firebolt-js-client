# Canonical AST — Node Type Definitions

> **Meta-guideline.** This document defines every node type in the Canonical AST.
> The AST is the single language-neutral representation from which all language
> headers are generated. It is parsed from OpenRPC; it does not come from specs directly.
>
> Node types are expressed as TypeScript-style type aliases for precision.
> The generator implementation is TypeScript, so these types are directly implementable.

---

## Overview

```
OpenRPC (JSON)
      │
      ▼  (AST builder — openrpc → ast)
CanonicalAST
      │
      ├── Module[]
      │     ├── TypeDecl[]
      │     └── Method[]
      │
      ▼  (generators — ast → headers)
Per-language output
```

The AST answers: *"How do all languages see this API?"*
It carries all information needed by generators and nothing implementation-specific.

---

## Root

```typescript
interface CanonicalAST {
  /** Firebolt API version, e.g. "9.0" */
  version: string;
  /** All modules parsed from OpenRPC, in source order */
  modules: Module[];
}
```

---

## Module

```typescript
interface Module {
  /** PascalCase module name, e.g. "Device", "Lifecycle2" */
  name: string;
  description: string;
  /** Named type declarations (enums, objects, aliases) */
  types: TypeDecl[];
  /** All methods — both call and subscribe kinds */
  methods: Method[];
}
```

---

## Method

```typescript
interface Method {
  /** camelCase method name as it appears in generated output, e.g. "watched" */
  name: string;
  /** The parent module name — for cross-referencing */
  module: string;
  /**
   * call      — request/response. Result is the return value.
   * subscribe — subscription. Result is the event payload type.
   *             The listen param is NOT present here; it is a transport detail.
   *             Generators emit a callback + unsubscribe pattern instead.
   */
  kind: "call" | "subscribe";
  params: Param[];
  /**
   * For kind=call:      the return value type. PrimitiveRef(null) means void.
   * For kind=subscribe: the event payload type received by the callback.
   *
   * Note: ListenResponse is NOT included here. It is a transport-layer concern
   * and is not visible to generators or consumers of the AST.
   */
  result: TypeRef;
  deprecated: false | DeprecationInfo;
  since: string;
  description: string;
  examples: MethodExample[];
}

interface Param {
  name: string;
  type: TypeRef;
  required: boolean;
  description: string;
}

interface MethodExample {
  description: string;
  params: Record<string, unknown>;
  result: unknown;
}

interface DeprecationInfo {
  since: string;
  replacement?: string;
}
```

---

## TypeDecl

A `TypeDecl` is a named, reusable type definition. All `TypeDecl` nodes live in
`Module.types`. The discriminant is `kind`.

```typescript
type TypeDecl =
  | EnumType
  | ObjectType
  | UnionType
  | ArrayAlias
  | ScalarAlias;
```

### EnumType

```typescript
interface EnumType {
  kind: "enum";
  name: string;
  description: string;
  values: EnumValue[];
}

interface EnumValue {
  /**
   * The serialized form — the exact string value on the wire (in JSON).
   * This is what OpenRPC schemas use and what is sent/received over JSON-RPC.
   * Examples: "app:adult", "dolbyDigital5.1", "initializing"
   */
  serializedId: string;
  /**
   * The language-safe identifier derived from serializedId.
   * Used in generated code where the wire string is not a valid identifier.
   * Derived by the AST builder using the enum identifier derivation algorithm
   * (see openrpc-derivation.md). Generators use this, not serializedId.
   * Examples: "AppAdult", "DolbyDigital51", "Initializing"
   */
  identifier: string;
  description?: string;
}
```

### ObjectType

```typescript
interface ObjectType {
  kind: "object";
  name: string;
  description: string;
  fields: ObjectField[];
}

interface ObjectField {
  name: string;
  type: TypeRef;
  required: boolean;
  description: string;
}
```

### UnionType

Used when a schema uses `anyOf` / `oneOf` with multiple concrete types
(not including the ListenResponse union, which is stripped by the AST builder).

```typescript
interface UnionType {
  kind: "union";
  name: string;
  description: string;
  variants: TypeRef[];
}
```

### ArrayAlias

A named type that is defined as an array of another type.

```typescript
interface ArrayAlias {
  kind: "array-alias";
  name: string;
  description: string;
  items: TypeRef;
}
```

### ScalarAlias

A named type that is an alias for a primitive (e.g. a constrained string).

```typescript
interface ScalarAlias {
  kind: "scalar-alias";
  name: string;
  description: string;
  primitive: PrimitiveKind;
  format?: string;
}
```

---

## TypeRef

A `TypeRef` is a use-site reference to a type. It appears in `Param.type`,
`Method.result`, `ObjectField.type`, and `ArrayAlias.items`.

```typescript
type TypeRef =
  | PrimitiveRef    // a built-in primitive
  | NamedRef        // a reference to a TypeDecl by name
  | ArrayRef        // an anonymous array of another TypeRef
  | OptionalRef;    // wraps another TypeRef as optional/nullable
```

### PrimitiveRef

```typescript
interface PrimitiveRef {
  kind: "primitive";
  primitive: PrimitiveKind;
  /**
   * Present when the primitive has a semantic format constraint.
   * Currently defined: "date-time" (ISO 8601 UTC)
   * Generators use this to emit language-idiomatic datetime types.
   */
  format?: "date-time" | string;
}

type PrimitiveKind =
  | "string"    // UTF-8 string
  | "boolean"   // true / false
  | "integer"   // signed or unsigned integer (see NamedRef for unsigned)
  | "number"    // 64-bit double
  | "null";     // absence of value / void result
```

### NamedRef

```typescript
interface NamedRef {
  kind: "named";
  /** Must resolve to a TypeDecl.name within the same module or shared module */
  name: string;
  /** The module that owns this type. Omit for same-module refs. */
  module?: string;
}
```

### ArrayRef

```typescript
interface ArrayRef {
  kind: "array";
  items: TypeRef;
}
```

### OptionalRef

Used when a field or param is `required: false` and the type system needs
to express optionality at the type level rather than the declaration level.
Generators use the `Param.required` / `ObjectField.required` flags directly
for most purposes; `OptionalRef` is reserved for type-level nullable schemas.

```typescript
interface OptionalRef {
  kind: "optional";
  inner: TypeRef;
}
```

---

## AST Builder Rules

When building the AST from OpenRPC, the builder applies these rules:

### Rule 1 — Strip `ListenResponse` from subscribe result

All subscribe methods in OpenRPC have a `oneOf: [ListenResponse, <PayloadType>]` result.
The AST builder must strip `ListenResponse` from the union and set `Method.result`
to the payload type only. Generators never see `ListenResponse`.

### Rule 2 — Strip `listen` param

All subscribe methods in OpenRPC have a `listen: boolean` param injected by derivation.
The AST builder must remove this param. `Method.params` is empty for most subscribe methods
unless the event genuinely takes filtering parameters (currently none in Firebolt 9).

### Rule 3 — Derive `EnumValue.identifier` from `EnumValue.serializedId`

Apply the derivation algorithm from `openrpc-derivation.md` at AST build time.
Both fields must be populated on every `EnumValue` node.

### Rule 4 — Resolve `$ref` to module-local names

All `$ref` values in the OpenRPC schema become `NamedRef` nodes in the AST.
The builder resolves the module ownership at build time and populates
`NamedRef.module` for cross-module references.

### Rule 5 — `format: "date-time"` propagation

When a JSON Schema string field has `"format": "date-time"`, the AST builder
must set `PrimitiveRef.format = "date-time"` on the resulting `PrimitiveRef` node.
Generators consult this field to emit the language-idiomatic datetime type.

### Rule 6 — Anonymous inline schemas get synthetic names

If a result or param schema is defined inline in OpenRPC (not via `$ref`), the
AST builder creates a `TypeDecl` with a synthetic name: `<Module><MethodName>Result`
or `<Module><MethodName>Param<Index>`. This should not happen in well-authored specs
but is handled defensively.

---

## Complete AST Example

For the two worked methods (`Discovery.watched` and `Lifecycle2.onStateChanged`):

```
CanonicalAST {
  version: "9.0",
  modules: [
    Module {
      name: "Discovery",
      types: [
        EnumType {
          kind: "enum",
          name: "AgePolicy",
          values: [
            { serializedId: "app:adult", identifier: "AppAdult" },
            { serializedId: "app:child", identifier: "AppChild" },
            { serializedId: "app:teen",  identifier: "AppTeen"  }
          ]
        }
      ],
      methods: [
        Method {
          name: "watched",
          module: "Discovery",
          kind: "call",
          params: [
            { name: "entityId",  type: PrimitiveRef(string),              required: true  },
            { name: "progress",  type: PrimitiveRef(number),              required: false },
            { name: "completed", type: PrimitiveRef(boolean),             required: false },
            { name: "watchedOn", type: PrimitiveRef(string, "date-time"), required: false },
            { name: "agePolicy", type: NamedRef("AgePolicy"),             required: false }
          ],
          result: PrimitiveRef(null)
        }
      ]
    },
    Module {
      name: "Lifecycle2",
      types: [
        EnumType {
          kind: "enum",
          name: "LifecycleState",
          values: [
            { serializedId: "initializing", identifier: "Initializing" },
            { serializedId: "paused",       identifier: "Paused"       },
            { serializedId: "active",       identifier: "Active"       },
            { serializedId: "suspended",    identifier: "Suspended"    },
            { serializedId: "hibernated",   identifier: "Hibernated"   },
            { serializedId: "terminating",  identifier: "Terminating"  }
          ]
        },
        ObjectType {
          kind: "object",
          name: "StateChangedEvent",
          fields: [
            { name: "oldState", type: NamedRef("LifecycleState"), required: true },
            { name: "newState", type: NamedRef("LifecycleState"), required: true }
          ]
        }
      ],
      methods: [
        Method {
          name: "onStateChanged",
          module: "Lifecycle2",
          kind: "subscribe",
          params: [],                            // listen param stripped by Rule 2
          result: NamedRef("StateChangedEvent")  // ListenResponse stripped by Rule 1
        }
      ]
    }
  ]
}
```
