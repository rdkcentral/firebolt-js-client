# Proposal

## Why

Web-based Firebolt apps need the ability to receive specific key events even when not in focus, as long as they remain in the Active lifecycle state. This enables scenarios like global hotkeys and background key handling for TV platform requirements. The key interception capability is a standard feature in web-based app runtimes that was missing from the Firebolt 9 API surface.

## What Changes

- Add a new `Window` API module for web platforms only
- Implement `addKeyIntercepts(keys: string[])` action to register keys for background reception
- Implement `removeKeyIntercepts(keys: string[])` action to unregister keys
- Keys use JS `event.key` values from the Firebolt Key Codes Specification
- Both methods return errors if called when the app is not in the Active lifecycle state
- Initial intercept set is empty when an app becomes active
- No-op behavior for duplicate adds or missing removes
- Server-side key validation (no client-side validation)

## Capabilities

### New Capabilities

- `api/window`: Key interception module for web-based Firebolt apps, enabling apps to receive specific key events when active but not focused

### Modified Capabilities

None

## Impact

**Pipeline Impact:**
- [spec] New spec file: `openspec/specs/api/window/spec.md`
- [openrpc] New OpenRPC file: `src/openrpc/window.json`
- [ast] No AST changes (uses existing action and array parameter patterns)
- [generator] Generates TypeScript, ReScript, and Kotlin/JS headers (web platform only)

**Target Languages:**
- TypeScript (.d.ts) - new Window module type definitions
- ReScript (.res) - new Window module bindings
- Kotlin/JS (.kt) - new Window module declarations
- C++ (.hpp) - NOT generated (platform: web only)
- Python (.pyi, .py) - NOT generated (platform: web only)

**Dependencies:**
- References `Lifecycle2` module for Active lifecycle state context
- Uses Firebolt Key Codes Specification for key values
