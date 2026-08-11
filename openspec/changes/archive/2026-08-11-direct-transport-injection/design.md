## Context

**Current State**: FireboltServiceManager uses a two-phase initialization:
1. App calls `configure({ clientId })` to store the clientId in closure
2. App calls `get()`, which looks up `window.__firebolt_transport__` global and passes clientId to all transport methods

**Problem**: This creates hidden dependencies on window globals and splits responsibility between app code (configure) and global state (transport lookup). The clientId is redundant since the transport is already page-specific; injection model is cleaner.

**Constraint**: The WPE extension injects the transport; we're changing the injection point and interface, not the transport behavior itself.

## Goals / Non-Goals

**Goals:**
- Eliminate window global dependency; transport is explicitly injected
- Simplify public API (single `transport()` call replaces configure pattern)
- Provide symmetric lifecycle (connect ↔ disconnect)
- Reduce closure state (remove clientId; transport is source of truth)
- Make error states explicit (guard on transport availability)

**Non-Goals:**
- Change transport protocol or message format
- Add authentication or encryption (transport owns that)
- Support multiple transports per FireboltServiceManager (one per page)
- Support reconnection with a different transport (transport is locked on first injection)

## Decisions

### Decision 1: One-time Injection with Lock

**Choice**: Transport is injected once via `transport(t)` and locked against re-injection.

**Rationale**: 
- Prevents accidental transport swaps mid-stream
- Clarifies intent: this is page initialization, not runtime switching
- Simpler state machine (no conditional transport selection)

**Alternatives Considered**:
- Allow transport swaps: Would require tracking active calls and deciding whether to reroute them (complexity)
- Lazy injection (transport set when first method called): Loses clarity of initialization phase

### Decision 2: Transport Interface is ClientId-Agnostic

**Choice**: Transport methods drop the clientId parameter:
- `t.send(msg)` instead of `t.send(clientId, msg)`
- `t.onMessage(cb)` instead of `t.onMessage(clientId, cb)`
- `t.connect()` instead of `t.connect(clientId)`

**Rationale**: 
- ClientId was used to multiplex multiple Firebolt clients on one transport
- Each page has one `<script>` injection → one transport → one clientId context
- ClientId is WPE/extension-internal; app doesn't care about it
- Simplifies generator (no state variable for clientId)

**Alternatives Considered**:
- Keep clientId parameter: Requires transport to maintain clientId routing (still supports multiplexing if needed, but adds complexity for single-client case)
- Make clientId optional in transport: Unclear API contract

### Decision 3: Disconnect is Symmetric and Stateful

**Choice**: 
- `client.disconnect()` exists on FireboltClient (returned from `get()`)
- Calls `transport.disconnect()` and resets internal state
- State reset: `_connected=false`, `_fireboltInstance=null`, clear listeners, reject pending calls
- Subsequent `get()` calls trigger a fresh connection

**Rationale**: 
- Matches user intent: disconnect = reset, ready to reconnect
- Cleans up all ephemeral state (listeners, pending calls)
- Symmetric to connect: both reset connection state flags
- Allows app to recover from network issues or explicit teardown

**Alternatives Considered**:
- No disconnect (one-shot): Doesn't support reconnection or error recovery
- Disconnect as transport-only method: Less discoverable, app doesn't know state was reset

### Decision 4: FireboltServiceManager State During Disconnect

**Choice**: Disconnect clears `_connectionResolvers` queue (don't reject pending get() calls, just forget them).

**Rationale**: 
- If app called `get()` and is awaiting, disconnect could either reject or resolve later
- Rejecting is cleaner: app knows connection failed
- Actually: after thinking through it, we should reject with a DisconnectError so app knows why the promise failed

**Alternatives Considered**:
- Reject all queued resolvers: Clean error semantics (app knows get() failed because of disconnect)
- Resolve them anyway: Confusing (get() seemed to work but no connection)

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Accidental double-injection** | Guarded by lock check; throws Error on re-injection attempt. Dev discovers immediately in test. |
| **Transport not injected before get()** | Same guard as current (if (!_transport) throw). Error message clarifies "transport not set" vs "configure not called". |
| **App crashes during disconnect** | All pending calls rejected with DisconnectError; listeners cleared. App must handle rejection or connection loss. |
| **Pending calls rejected on disconnect** | Expected behavior (connection lost). App should retry logic in error handler if needed. |
| **Transport swap requirement** | Not supported. If app needs different transport, page must reload. Acceptable for WPE use case. |

## Migration Plan

1. **Generator Phase** (src/generators/inject-js.ts):
   - Replace `_clientId` state with `_transport` (locked) and `_transportSet` flag
   - Update `_rpcCall()` and `_subscribe()` to use `_transport.send(msg)` (no clientId)
   - Rename `_configure()` to `_setTransport(transport)` with lock check
   - Add `_disconnect()` method with full state reset
   - Update `_buildFireboltInstance()` to attach `disconnect` to client before freezing
   - Update `_get()` to check `_transport` availability

2. **Bundle Update**:
   - Regenerate `out/inject-js/firebolt-inject.js` with new STATIC_RUNTIME

3. **Tests**:
   - Update inject-js.test.ts to use new `transport()` method
   - Add tests for one-time injection guard
   - Add tests for disconnect state reset
   - Add tests for reconnection via new get()

4. **Rollout**:
   - This is a pre-deployment change (firebolt-js-client is not yet shipped)
   - WPE extension code will need corresponding updates (transport interface change)
   - App code will need to call `transport(t)` instead of `configure({clientId})`

## Open Questions

1. **Should queued get() promises be rejected on disconnect, or just forgotten?**  
   → Prefer: Reject with DisconnectError for clear app feedback

2. **Should transport be validated (check for required methods) on injection?**  
   → Defer: Transport is WPE-internal; runtime errors will surface quickly

3. **Error message for "transport not set": Should it distinguish first get() vs mid-stream error?**  
   → Keep simple: "Transport not set via FireboltServiceManager.transport()"
