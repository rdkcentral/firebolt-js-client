## Context

The inject-js generator produces JavaScript method stubs that wrap JSON-RPC calls, while the TypeScript generators produce `.d.ts` definition files for type safety. Previously, the TypeScript definitions used positional parameters for methods with multiple parameters (e.g., `Actions.start(intent: string, handlerAppId?: string)`), which did not match the inject-js runtime's single object parameter pattern. Additionally, event callbacks lacked the two-parameter signature `(event, cancelled: boolean)` needed for cancellation support on connection failures.

The inject-js runtime already supports the object parameter pattern as documented in `openspec/specs/_meta/inject-js-parameter-patterns.md`, but the TypeScript definitions were not aligned with this pattern. This misalignment made the TypeScript definitions inconsistent with the actual runtime behavior and reduced developer ergonomics.

## Goals / Non-Goals

**Goals:**
- Align TypeScript definitions with inject-js runtime parameter patterns
- Improve developer ergonomics by providing parameter interfaces for type annotations
- Add JSDoc examples to help developers understand parameter usage
- Organize all type declarations under `Firebolt.Module` namespace for better discoverability
- Export the `Firebolt` namespace for direct consumption in TypeScript code
- Fix Metrics module parameter interfaces that were incorrectly using primitive types

**Non-Goals:**
- Change the Firebolt API specification (this is a generator implementation change only)
- Modify the inject-js runtime behavior (runtime already supports the target patterns)
- Update other language generators (Kotlin, C++, Python, ReScript) - only TypeScript generators
- Support named arguments pattern (positional parameters) - excluded due to complexity and JSON-RPC mismatch

## Decisions

### Decision 1: Single Object Parameter Pattern for All Methods with Parameters

**Choice:** All methods with parameters use a single object parameter instead of positional parameters.

**Rationale:**
- **Consistency:** Aligns with inject-js runtime behavior and documented parameter patterns
- **Type Safety:** Parameter interfaces provide better type checking and IDE autocomplete
- **Refactoring-Friendly:** Parameter names can be changed without breaking call sites
- **JSON-RPC Alignment:** Matches the JSON-RPC convention of named parameters in an object

**Example:**
```typescript
// Old pattern (positional)
Actions.start("watch", "app123")

// New pattern (object)
Actions.start({ intent: "watch", handlerAppId: "app123" })
```

### Decision 2: Firebolt.Module Namespace Organization

**Choice:** Organize all type declarations and methods under `Firebolt.Module` namespace.

**Rationale:**
- **Discoverability:** Developers can easily find all types under the `Firebolt` namespace
- **Collision Avoidance:** Module-specific types are scoped to their module namespace
- **Consistency:** Matches the inject-js factory pattern where `Firebolt` is the root namespace
- **IDE Support:** Better autocomplete and type resolution

**Example:**
```typescript
Firebolt.Actions.StartParams
Firebolt.Discovery.WatchedParams
Firebolt.Metrics.PageParams
```

### Decision 3: Parameter Interface Naming Convention

**Choice:** Use `MethodParams` naming convention (e.g., `StartParams`, `WatchedParams`) instead of `ModuleMethodParams`.

**Rationale:**
- **Conciseness:** Shorter names are easier to type and read
- **Namespace Context:** The module name is already in the namespace path (`Firebolt.Actions.StartParams`)
- **Clarity:** Method name clearly indicates which method the interface is for
- **Collision Avoidance:** Different modules can have methods with the same name without conflicts

### Decision 4: Two-Parameter Event Callback Signature

**Choice:** Event callbacks accept two parameters `(event, cancelled: boolean)` for cancellation support.

**Rationale:**
- **Cancellation Support:** Allows developers to react to connection failures
- **Spec Alignment:** Matches the inject-js spec requirement for event cancellation
- **Error Handling:** Provides a clean way to distinguish between normal events and cancellation signals
- **Backward Compatibility:** Since there are no current users, this is acceptable

**Example:**
```typescript
Actions.onIntent((event, cancelled) => {
  if (cancelled) {
    console.log("Event subscription was cancelled");
    return;
  }
  console.log("Intent received:", event);
});
```

### Decision 5: JSDoc Examples with Realistic Values

**Choice:** Add `@example` tags to all methods with parameters, showing realistic parameter values.

**Rationale:**
- **Developer Experience:** Developers can quickly understand how to use each method
- **IDE Support:** Examples appear in hover documentation and autocomplete
- **Onboarding:** Reduces learning curve for new developers
- **Contextual Values:** Parameter names trigger contextual examples (e.g., `intent` gets JSON, `entityId` gets realistic IDs)

**Example:**
```typescript
/** Send an intent to the platform.
 * @example
 *   const params: Firebolt.Actions.StartParams = {
 *     intent: '{"action":"play","entityId":"entity-123"}'
 *   };
 *   Firebolt.Actions.start(params); */
```

### Decision 6: Export Firebolt Namespace

**Choice:** Export the `Firebolt` namespace in inject-js definitions using `export as namespace Firebolt`.

**Rationale:**
- **Direct Consumption:** Developers can use the namespace without imports in some contexts
- **Global Availability:** Makes the namespace accessible in IDEs and documentation tools
- **Package Distribution:** The `@firebolt-js/types` package properly exports the namespace

## Spec → OpenRPC → AST → Emitted Code Chain

### Example: Actions.start Method

**Spec (openspec/specs/actions/spec.md):**
```markdown
### Action: start
**Kind:** action
**Params:**
- intent (string, required)
- handlerAppId (string, optional)
```

**OpenRPC (src/openrpc/actions.json):**
```json
{
  "name": "Actions.start",
  "params": [
    { "name": "intent", "required": true, "schema": { "type": "string" } },
    { "name": "handlerAppId", "required": false, "schema": { "type": "string" } }
  ]
}
```

**Canonical AST (in-memory):**
```typescript
{
  name: "start",
  kind: "call",
  params: [
    { name: "intent", type: { kind: "primitive", primitive: "string" }, required: true },
    { name: "handlerAppId", type: { kind: "primitive", primitive: "string" }, required: false }
  ],
  result: null
}
```

**Emitted Code (generated/ts/Actions.d.ts):**
```typescript
declare namespace Firebolt {
  namespace Actions {
    interface StartParams {
      intent: string;
      handlerAppId?: string;
    }

    /** Send an intent to the platform.
     * @example
     *   const params: Firebolt.Actions.StartParams = {
     *     intent: '{"action":"play","entityId":"entity-123"}'
     *   };
     *   Firebolt.Actions.start(params); */
    function start(params: StartParams): Promise<void>;
  }
}
```

## Risks / Trade-offs

### Risk 1: Breaking Change for Existing TypeScript Code

**Risk:** Existing TypeScript code using positional parameters will need to be updated to use object parameters.

**Mitigation:** Since there are no current developers using this API, the impact is minimal. The change improves the API for future users.

### Risk 2: TypeScript Definition Mismatch

**Risk:** TypeScript definitions might not match the inject-js runtime behavior.

**Mitigation:** The implementation follows the documented parameter patterns in `openspec/specs/_meta/inject-js-parameter-patterns.md`, ensuring alignment with runtime behavior.

### Risk 3: Increased Bundle Size

**Risk:** Adding parameter interfaces and JSDoc examples might increase the generated bundle size.

**Mitigation:** The impact is minimal - parameter interfaces are small, and JSDoc comments are stripped at runtime. The ergonomic benefits outweigh the negligible size increase.

### Trade-off: Simpler Interface Names vs. Module Scoping

**Trade-off:** We chose shorter interface names (`StartParams` vs `ActionsStartParams`) with module namespace scoping.

**Rationale:** The `Firebolt.Actions.StartParams` path provides clear module context while keeping interface names concise and readable.

## Migration Plan

Since this is a generator implementation change with no current users, no migration is required for existing code. The migration path for future developers is:

1. **Generator Update:** Deploy the updated TypeScript generators
2. **Regenerate Definitions:** Run the generator to produce new `.d.ts` files
3. **Update Package:** Copy the updated inject-js definitions to the package folder
4. **Developer Migration:** Future developers update their code to use the new parameter pattern

**Rollback Strategy:** If issues arise, revert to the previous generator version and regenerate the definitions. The old positional parameter pattern can be restored if needed.

## Open Questions

None - all technical decisions have been made and implemented.