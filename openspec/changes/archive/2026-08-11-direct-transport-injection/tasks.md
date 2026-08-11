## 1. Generator State Changes

- [x] 1.1 [generator] Replace `_clientId` closure variable with `_transport` and `_transportSet` flag in STATIC_PREAMBLE
- [x] 1.2 [generator] Update STATIC_RUNTIME structure to use injected transport instead of window global lookup
- [x] 1.3 [generator] Verify `_connecting`, `_connected`, `_fireboltInstance`, `_connectionResolvers`, `_pendingCalls`, `_eventListeners` state variables remain unchanged

## 2. Generator Public API

- [x] 2.1 [generator] Rename `_configure()` to `_setTransport(transport)` with one-time injection guard
- [x] 2.2 [generator] Update `_setTransport()` to check `_transportSet` flag and throw on double injection
- [x] 2.3 [generator] Update `_setTransport()` to store transport in `_transport` variable (do not call any transport methods)
- [x] 2.4 [generator] Update `_get()` to check `if (!_transport)` instead of checking for `configure()` call
- [x] 2.5 [generator] Update error message in `_get()` to say "Transport not set via FireboltServiceManager.transport()"
- [x] 2.6 [generator] Update `_buildFireboltServiceManager()` to expose `transport` method instead of `configure` method
- [x] 2.7 [generator] Verify FireboltServiceManager members are now: `version`, `transport`, `get`

## 3. Generator Transport Interface Changes

- [x] 3.1 [generator] Update `_rpcCall()` to pass only `msg` to `_transport.send(msg)` (remove `_clientId` argument)
- [x] 3.2 [generator] Update `_onMessage()` handler to call `_transport.onMessage(callback)` (no `_clientId` argument)
- [x] 3.3 [generator] Update connection flow: `_transport.onConnectionStatus(callback)` then `_transport.connect()` (no `_clientId` arguments)
- [x] 3.4 [generator] Remove all references to `_clientId` variable from transport method calls

## 4. Generator Disconnect Implementation

- [x] 4.1 [generator] Create `_disconnect()` method that calls `_transport.disconnect()`
- [x] 4.2 [generator] Implement state reset in `_disconnect()`: clear `_eventListeners`, clear `_pendingCalls`, set `_connected=false`, set `_fireboltInstance=null`
- [x] 4.3 [generator] Implement pending call rejection in `_disconnect()`: reject all pending promises with DisconnectError
- [x] 4.4 [generator] Add `disconnect()` method to FireboltClient (frozen instance) that calls `_disconnect()` and clears singleton reference
- [x] 4.5 [generator] Verify reconnection works: after `disconnect()`, next `get()` initiates fresh connection with same transport

## 5. Bundle Regeneration

- [x] 5.1 [generator] Regenerate STATIC_PREAMBLE with new state structure
- [x] 5.2 [generator] Regenerate STATIC_RUNTIME with transport injection flow
- [x] 5.3 [generator] Verify generated bundle size and complexity (should be similar to before)
- [x] 5.4 [generator] Rebuild out/inject-js/firebolt-inject.js with new generator

## 6. Unit Test Updates

- [x] 6.1 [test] Update inject-js.test.ts to replace `configure()` calls with `transport()` calls in all test setup
- [x] 6.2 [test] Update test scenario "FireboltServiceManager has expected members" to expect `transport` instead of `configure`
- [x] 6.3 [test] Add test scenario: "transport() throws on double injection"
- [x] 6.4 [test] Add test scenario: "get() before transport() throws with correct message"
- [x] 6.5 [test] Add test scenario: "transport() does not validate during injection"
- [x] 6.6 [test] Add test scenario: "disconnect() clears listeners and resets state"
- [x] 6.7 [test] Add test scenario: "pending calls rejected on disconnect()"
- [x] 6.8 [test] Add test scenario: "reconnection after disconnect() initiates fresh connection"
- [x] 6.9 [test] Verify transport.send() is called without clientId argument in all call/subscribe tests
- [x] 6.10 [test] Run full test suite: inject-js.test.ts, consistency.test.ts, builder.test.ts

## 7. Integration Tests

- [x] 7.1 [test] Update inject-js-infra.test.ts to use new transport injection pattern
- [x] 7.2 [test] Verify all 6+ OpenRPC modules generate correctly with new transport model
- [x] 7.3 [test] Verify generated bundle has no references to `_clientId`
- [x] 7.4 [test] Run full integration suite and verify all tests pass

## 8. Documentation and Verification

- [x] 8.1 [generator] Verify spec.md requirements are met (one-time injection, clientId-agnostic transport, symmetric disconnect)
- [x] 8.2 [generator] Verify design.md decisions are implemented (locked transport, state reset on disconnect, reconnection support)
- [x] 8.3 [generator] Verify no breaking changes to other generator targets (TypeScript, Python, ReScript, Kotlin, C++)
- [x] 8.4 [test] Final verification: all 109+ tests passing, bundle generation clean, no console errors
