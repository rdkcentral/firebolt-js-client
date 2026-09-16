## 1. Generator Implementation

- [ ] 1.1 [generator] Rewrite STATIC_PREAMBLE to include factory function structure and new private state variables
- [ ] 1.2 [generator] Add common function references (_commonStringify, _commonParse, _commonArrayCheck) to preamble
- [ ] 1.3 [generator] Add extension schema private state variable (_extensionSchema)
- [ ] 1.4 [generator] Add debug mode private state variable (_debug)
- [ ] 1.5 [generator] Rewrite STATIC_RUNTIME to implement new transport interface (send, open, close)
- [ ] 1.6 [generator] Update _onMessage to handle debug logging
- [ ] 1.7 [generator] Replace _onStatus with _onOpen and _onClose handlers
- [ ] 1.8 [generator] Add _onError handler for auto-reconnect logic
- [ ] 1.9 [generator] Update _rpcCall to check connection state before sending
- [ ] 1.10 [generator] Add _send helper function with debug logging and failure callback
- [ ] 1.11 [generator] Add _connect function to call transport.open()
- [ ] 1.12 [generator] Add _notConnectedError helper function
- [ ] 1.13 [generator] Update _subscribe to check connection state and use new _send function
- [ ] 1.14 [generator] Update event listener callbacks to use two-parameter signature (object, cancelled)
- [ ] 1.15 [generator] Add clearPendingCalls function
- [ ] 1.16 [generator] Add clearEventListeners function with cancellation support
- [ ] 1.17 [generator] Add reset function to clear all state
- [ ] 1.18 [generator] Add _addMethodNoParams helper function using Object.defineProperty
- [ ] 1.19 [generator] Add _addMethodWithObjectParam helper function using Object.defineProperty
- [ ] 1.20 [generator] Add _addEvent helper function using Object.defineProperty
- [ ] 1.21 [generator] Add _registerModule helper function using Object.defineProperty
- [ ] 1.22 [generator] Add _addExtensions function to load and process extension schema
- [ ] 1.23 [generator] Update _buildFireboltInstance to call _addExtensions and return frozen registry
- [ ] 1.24 [generator] Add cleanup method to registry using Object.defineProperty
- [ ] 1.25 [generator] Rewrite STATIC_POSTAMBLE to implement factory function pattern
- [ ] 1.26 [generator] Add factory function parameter validation (transport, extensionSchema, enableDebug)
- [ ] 1.27 [generator] Add extension schema parsing and validation in factory function
- [ ] 1.28 [generator] Add transport interface validation in factory function
- [ ] 1.29 [generator] Add debug mode setup in factory function
- [ ] 1.30 [generator] Replace generate function to emit static module definitions instead of registry
- [ ] 1.31 [generator] Create emitStaticModules function to generate Object.defineProperty calls
- [ ] 1.32 [generator] Update module generation to use static _addMethodNoParams, _addMethodWithObjectParam, _addEvent calls
- [ ] 1.33 [generator] Remove emitMethodRegistry function (no longer needed for static generation)
- [ ] 1.34 [generator] Remove _makeCallStubNoParams, _makeCallStub, _makeSubscribeStub functions (replaced by static helpers)
- [ ] 1.35 [generator] Remove _buildFireboltInstance dynamic module building logic
- [ ] 1.36 [generator] Remove disconnect method (replaced by cleanup)
- [ ] 1.37 [generator] Remove FireboltServiceManager global pattern
- [ ] 1.38 [generator] Remove transport() setter and get() method pattern
- [ ] 1.39 [generator] Remove onConnectionStatus callback handling
- [ ] 1.40 [generator] Update IIFE structure to return factory function instead of exposing global

## 2. Test Implementation

- [ ] 2.1 [test] Update test mock transport to implement new interface (send, open, close)
- [ ] 2.2 [test] Update test mock transport to use callback properties (onMessage, onOpen, onClose, onError)
- [ ] 2.3 [test] Add test for factory function creation with valid parameters
- [ ] 2.4 [test] Add test for factory function validation (missing transport)
- [ ] 2.5 [test] Add test for factory function validation (invalid transport)
- [ ] 2.6 [test] Add test for extension schema parsing with valid JSON
- [ ] 2.7 [test] Add test for extension schema parsing with invalid JSON
- [ ] 2.8 [test] Add test for debug mode enablement
- [ ] 2.9 [test] Add test for debug mode transport exposure
- [ ] 2.10 [test] Add test for build() method resolving after onOpen
- [ ] 2.11 [test] Add test for build() method returning existing instance when already connected
- [ ] 2.12 [test] Add test for build() method setting callbacks only once
- [ ] 2.13 [test] Add test for onOpen callback handling and connection state
- [ ] 2.14 [test] Add test for onClose callback handling and connection state
- [ ] 2.15 [test] Add test for onError callback handling and auto-reconnect
- [ ] 2.16 [test] Add test for event listener two-parameter signature
- [ ] 2.17 [test] Add test for event listener cancellation (null, true)
- [ ] 2.18 [test] Add test for cleanup method
- [ ] 2.19 [test] Add test for cleanup method clearing event listeners with cancellation
- [ ] 2.20 [test] Add test for cleanup method rejecting pending calls
- [ ] 2.21 [test] Add test for extension schema loading and method addition
- [ ] 2.22 [test] Add test for extension schema loading and event addition
- [ ] 2.23 [test] Add test for extension schema loading and module creation
- [ ] 2.24 [test] Add test for debug mode message logging
- [ ] 2.25 [test] Update existing call method tests for new transport interface
- [ ] 2.26 [test] Update existing subscribe method tests for new event signature
- [ ] 2.27 [test] Update existing connection tests for onOpen/onClose callbacks
- [ ] 2.28 [test] Verify all existing tests still pass after changes

## 3. Documentation

- [ ] 3.1 [generator] Update openspec/specs/_meta/inject-js-parameter-patterns.md to reflect static generation approach
- [ ] 3.2 [generator] Document extension schema format in openspec/specs/_meta/extension-schema.md
- [ ] 3.3 [generator] Document factory pattern usage in openspec/specs/_meta/inject-js-factory-pattern.md
- [ ] 3.4 [generator] Document transport interface changes in openspec/specs/_meta/inject-js-transport-interface.md
- [ ] 3.5 [generator] Document event listener cancellation in openspec/specs/_meta/inject-js-event-cancellation.md

## 4. Verification

- [ ] 4.1 [generator] Generate inject-js bundle with new factory pattern
- [ ] 4.2 [generator] Verify generated bundle returns factory function
- [ ] 4.3 [generator] Verify generated bundle includes static Object.defineProperty calls
- [ ] 4.4 [generator] Verify generated bundle includes new transport interface handlers
- [ ] 4.5 [generator] Verify generated bundle includes extension schema loading logic
- [ ] 4.6 [generator] Verify generated bundle includes debug mode support
- [ ] 4.7 [generator] Verify generated bundle includes cleanup method
- [ ] 4.8 [generator] Verify generated bundle structure matches firebolt-builder.js reference
- [ ] 4.9 [test] Run all inject-js tests to ensure no regressions
- [ ] 4.10 [test] Run full test suite to ensure no cross-generator regressions
