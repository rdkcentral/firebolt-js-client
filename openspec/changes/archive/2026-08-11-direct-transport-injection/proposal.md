## Why

The current two-phase initialization model (configure clientId, then window global lookup) creates hidden dependencies and unsafe global state access. By shifting to direct transport injection, we eliminate the need for window globals, simplify the public API surface, and provide a cleaner separation of concerns: the WPE extension explicitly hands over the transport, FireboltServiceManager takes ownership of it, and the app never deals with transport plumbing.

## What Changes

- **BREAKING**: Replace `FireboltServiceManager.configure({ clientId })` with `FireboltServiceManager.transport(transport)` — one-time injection of the transport layer
- **BREAKING**: Transport interface changes from clientId-aware to clientId-agnostic:
  - `transport.send(clientId, msg)` → `transport.send(msg)`
  - `transport.onMessage(clientId, cb)` → `transport.onMessage(cb)`
  - `transport.onConnectionStatus(clientId, cb)` → `transport.onConnectionStatus(cb)`
  - `transport.connect(clientId)` → `transport.connect()`
  - New: `transport.disconnect()` (symmetric teardown)
- **New**: `FireboltClient.disconnect()` method for explicit connection teardown
- **Removed**: Dependency on `window.__firebolt_transport__` global lookup
- **Simplified**: `_clientId` state eliminated; transport is now the single source of truth

## Capabilities

### Modified Capabilities

- `wpe-inject-js-generator`: Change FireboltServiceManager initialization from configure-based clientId storage to direct transport injection; add symmetric disconnect lifecycle

## Impact

- **firebolt-inject.js generator** (`src/generators/inject-js.ts`): Refactor private state, method signatures, transport access pattern, disconnect handling
- **Generated bundle size**: Minimal (no significant code growth)
- **API surface**: Public (FireboltServiceManager interface changes)
- **Backward compatibility**: BREAKING — apps must call `transport(t)` instead of `configure({ clientId })`
- **Transport implementations**: Must adapt to new clientId-agnostic interface (no longer passed to send/onMessage/connect)
