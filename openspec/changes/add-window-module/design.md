# Design

## Context

The Firebolt 9 API surface currently lacks key interception capabilities for web-based apps. Existing modules like `Lifecycle2` define the Active lifecycle state, but there is no mechanism for apps to receive key events when active but not focused. This is a standard feature in web-based app runtimes that TV platforms require.

The spec-driven pipeline transforms human-readable specs into language-specific headers through four layers: OpenSpec → OpenRPC → Canonical AST → generated code. This change introduces a new module following established patterns without requiring AST changes.

## Goals / Non-Goals

**Goals:**
- Add a `Window` module with key interception actions for web platforms only
- Generate TypeScript, ReScript, and Kotlin/JS headers (no C++ or Python)
- Follow existing action and array parameter patterns from modules like `Display` and `Metrics`
- Ensure proper lifecycle state validation (error when not Active)

**Non-Goals:**
- C++ or Python support (platform: web only)
- New AST node types or generator changes
- Key validation in client library (server-side only)
- Query methods for the intercept set
- Events for intercepted keys

## Decisions

### Platform Classification: web only

**Decision:** Set `platform: web` to generate only TypeScript, ReScript, and Kotlin/JS headers.

**Rationale:** Key interception is a web runtime capability. Native SDK integrations (C++, Python) do not need this feature. This aligns with the platform classification pattern used by `Display.colorimetry` and `Display.videoResolutions`.

**Alternatives considered:**
- `platform: both` - Would generate C++ and Python headers unnecessarily
- `platform: native` - Would exclude web runtimes where this is needed

### Array Parameter Pattern

**Decision:** Use `type: array` with `items: string` for the `keys` parameter, following the pattern from `Localization.preferredAudioLanguages` and `Accessibility.ClosedCaptionsSettings.preferredLanguages`.

**Rationale:** This is the established pattern for string arrays in the codebase. The AST already handles array types correctly, and generators emit language-idiomatic array representations.

**Alternatives considered:**
- Comma-delimited string - Would require parsing and error handling
- Single key per call - Would require multiple round trips

### No AST Changes

**Decision:** Do not introduce new AST node types. The existing `Action` node with array parameters is sufficient.

**Rationale:** The AST already supports actions with array parameters (e.g., object params in `Metrics`). The spec → OpenRPC → AST transformation will work without modifications.

### Error Handling in Spec

**Decision:** Document lifecycle state errors in the spec description rather than defining a new error type.

**Rationale:** The `shared.json` already defines `FireboltError` with error codes 1-5. The platform will return an appropriate error (likely code 3 "Generic failure" or 4 "System failure") when called outside the Active state. No new error type is needed.

## Spec → OpenRPC → AST → Emitted Code Chain

### Example: Window.addKeyIntercepts

**1. OpenSpec (openspec/changes/add-window-module/specs/api/window/spec.md)**
```yaml
actions:
  - name: addKeyIntercepts
    description: |
      Adds the supplied list of keys to the set of keys that are received by this app
      when it is in the Active lifecycle state but not in focus.
    since: "9.0.0"
    params:
      - name: keys
        type: array
        items: string
        required: true
        description: List of one or more key identifiers, unordered
    result: null
```

**2. OpenRPC (src/openrpc/window.json) - derived from spec**
```json
{
  "openrpc": "1.2.4",
  "info": {
    "title": "Window",
    "version": "9.0",
    "x-firebolt-platform": "web",
    "description": "Provides key interception capabilities for web-based apps."
  },
  "methods": [
    {
      "name": "Window.addKeyIntercepts",
      "summary": "Add keys to intercept set",
      "description": "Adds the supplied list of keys to the set of keys that are received by this app when it is in the Active lifecycle state but not in focus.",
      "params": [
        {
          "name": "keys",
          "required": true,
          "schema": {
            "type": "array",
            "items": { "type": "string" }
          },
          "description": "List of one or more key identifiers, unordered"
        }
      ],
      "result": {
        "name": "result",
        "schema": { "type": "null" }
      },
      "examples": [
        {
          "name": "addKeys",
          "summary": "Add keys to intercept set",
          "params": [
            {
              "name": "keys",
              "value": ["Key1", "Key2"]
            }
          ],
          "result": {
            "name": "result",
            "value": null
          }
        }
      ]
    }
  ]
}
```

**3. Canonical AST (in-memory) - parsed from OpenRPC**
```typescript
{
  kind: "Module",
  name: "Window",
  version: "9.0",
  platform: "web",
  actions: [
    {
      kind: "Action",
      name: "addKeyIntercepts",
      description: "...",
      since: "9.0.0",
      params: [
        {
          kind: "Param",
          name: "keys",
          type: {
            kind: "ArrayRef",
            items: { kind: "PrimitiveRef", type: "string" }
          },
          required: true
        }
      ],
      result: { kind: "NullRef" }
    }
  ]
}
```

**4. Emitted Code - TypeScript (generated/ts/Window.d.ts)**
```typescript
export namespace Window {
  /**
   * Adds the supplied list of keys to the set of keys that are received by this app
   * when it is in the Active lifecycle state but not in focus.
   */
  export function addKeyIntercepts(keys: string[]): Promise<void>;

  /**
   * Removes the supplied list of keys from the set of keys that are received by this app
   * when it is in the Active lifecycle state but not in focus.
   */
  export function removeKeyIntercepts(keys: string[]): Promise<void>;
}
```

**5. Emitted Code - ReScript (generated/res/Window.res)**
```rescript
module Window = {
  @module("firebolt") @send
  external addKeyIntercepts: array<string> => Promise<unit> = "Window.addKeyIntercepts"

  @module("firebolt") @send
  external removeKeyIntercepts: array<string> => Promise<unit> = "Window.removeKeyIntercepts"
}
```

**6. Emitted Code - Kotlin/JS (generated/kt/Window.kt)**
```kotlin
external object Window {
  fun addKeyIntercepts(keys: Array<String>): Promise<Unit>
  fun removeKeyIntercepts(keys: Array<String>): Promise<Unit>
}
```

## Risks / Trade-offs

**[Risk] Array parameter validation**
- **Risk:** The spec does not define minimum/maximum array length or key format validation
- **Mitigation:** Server-side validation handles invalid keys. Client library passes through as-is, which is consistent with other modules like `Metrics`

**[Risk] Lifecycle state dependency**
- **Risk:** Apps may call these methods outside the Active state and receive errors
- **Mitigation:** Documented clearly in spec descriptions. Apps should check `Lifecycle2` state before calling, or handle errors gracefully

**[Trade-off] No query method**
- **Trade-off:** Cannot inspect the current intercept set
- **Rationale:** Not required for the use case. Apps track their own intercept set if needed. Simpler API surface.

**[Trade-off] No clear method**
- **Trade-off:** Must remove keys individually or call remove with all known keys
- **Rationale:** Simple add/remove semantics match the use case. Clear operation would require tracking state on the platform side.

## Open Questions

None. The design follows established patterns and the requirements are well-defined.
