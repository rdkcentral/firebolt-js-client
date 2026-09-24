## Context

The Firebolt JS Client project currently has two generators:
- **inject-js generator**: Creates `firebolt-inject.js` - a single IIFE bundle with a factory function pattern
- **typescript generator**: Creates per-module `.d.ts` files (e.g., `Device.d.ts`, `Accessibility.d.ts`) with individual namespaces

The inject-js generator produces a factory pattern:
```javascript
factory({ transport, extensionSchema, enableDebug }) → { build() } → Promise<FireboltClient>
```

Where `FireboltClient` is a frozen object with module namespaces (Accessibility, Device, etc.)

However, there's no corresponding TypeScript definition file that matches this factory/builder pattern. App developers who want IDE support must use the per-module `.d.ts` files, which don't match the runtime structure of the inject-js bundle.

## Goals / Non-Goals

**Goals:**
- Create a single TypeScript definition file that matches the inject-js factory/builder pattern
- Enable VS Code intellisense, hover documentation, and type safety for app developers
- Package the types as an npm package (`@firebolt-js/types`) for distribution via GitHub Packages
- Provide validation through a reference app that uses the package as a dev dependency
- Maintain backward compatibility with existing per-module `.d.ts` files

**Non-Goals:**
- Replacing the existing per-module `.d.ts` generator (both will coexist)
- Changing the inject-js generator behavior
- Modifying the Canonical AST or OpenRPC schema
- Creating runtime JavaScript code (this is type definitions only)

## Decisions

### 1. Full-AST Generator Architecture

**Decision**: Create `inject-js-types.ts` as a full-AST generator rather than a per-module generator.

**Rationale**: The inject-js bundle is a single file containing all modules, so the TypeScript definitions should also be a single file. A full-AST generator receives the complete Canonical AST and can emit a cohesive definition file that matches the bundle structure.

**Alternatives considered**:
- Per-module generator: Would require post-processing to combine files, more complex
- Separate factory + module generators: Would create multiple files, harder to use as a single package

### 2. Type Definition Structure

**Decision**: Generate a single `firebolt-inject.d.ts` file with the following structure:

```typescript
// Transport interface
interface FireboltTransport {
  send(data: string): void;
  open(): void;
  close(): void;
  onMessage?: (raw: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: unknown) => void;
}

// Extension schema interface
interface ExtensionSchema {
  name: string;
  methods?: string[];
  events?: string[];
  methodsWithObject?: string[];
}

// Factory configuration
interface FactoryConfig {
  transport: FireboltTransport;
  extensionSchema?: string | ExtensionSchema[];
  enableDebug?: boolean;
}

// Builder interface
interface FireboltBuilder {
  build(): Promise<FireboltClient>;
}

// Main FireboltClient interface with all modules
interface FireboltClient {
  Accessibility: typeof Accessibility;
  Device: typeof Device;
  // ... all other web/both platform modules
  cleanup(): void;
}

// Factory function type
declare function factory(config: FactoryConfig): FireboltBuilder;

// Export for npm package
export { factory, FireboltClient, FireboltTransport, FactoryConfig, ExtensionSchema };
```

**Rationale**: This structure exactly matches the inject-js runtime behavior while providing full type safety. The interfaces are exported so consumers can use them in their own code.

### 3. Reusing Existing Type Generation Logic

**Decision**: Reuse the type emission functions from `typescript.ts` (emitTypeDecl, emitMethod, etc.) rather than duplicating logic.

**Rationale**: The existing generator already handles complex cases like enum serialization, constraint formatting, and JSDoc generation. Reusing this ensures consistency and reduces maintenance burden.

**Spec → OpenRPC → AST → Emitted Code Chain Example:**

For the `Device.deviceClass()` method:

1. **Spec** (`openspec/specs/api/device/spec.md`):
   ```markdown
   ### Property: deviceClass
   - **Kind**: property
   - **Result**: DeviceClass (enum)
   ```

2. **OpenRPC** (`src/openrpc/device.json`):
   ```json
   {
     "name": "Device.deviceClass",
     "result": {
       "name": "result",
       "schema": { "$ref": "#/components/schemas/DeviceClass" }
     }
   }
   ```

3. **Canonical AST** (built by `src/ast/builder.ts`):
   ```typescript
   {
     name: "deviceClass",
     kind: "call",
     params: [],
     result: { kind: "named", name: "DeviceClass" },
     description: "Returns the class of the device."
   }
   ```

4. **Emitted TypeScript** (in `firebolt-inject.d.ts`):
   ```typescript
   declare namespace Device {
     /** Returns the class of the device. */
     function deviceClass(): Promise<DeviceClass>;
   }
   ```

### 4. Module Filtering

**Decision**: Filter modules to include only `platform: "web"` or `platform: "both"`, matching the inject-js generator behavior.

**Rationale**: The inject-js bundle only includes web-platform modules, so the TypeScript definitions should match exactly. Native-only modules (like Lifecycle2) should be excluded.

### 5. Package Naming and Distribution

**Decision**: Use `@firebolt-js/types` as the package name and publish to GitHub Packages.

**Rationale**: 
- Aligns with existing `@firebolt-js/sdk` package naming
- The "types" suffix clearly indicates this is a type definitions package
- GitHub Packages provides private registry for organization packages
- Scoped packages prevent naming conflicts

### 6. Reference App for Validation

**Decision**: Create `references/firebolt-type-reference-app/` as a dev dependency consumer.

**Rationale**: 
- Provides realistic validation environment that matches actual developer usage
- Dev dependency usage is appropriate since types are only needed during development
- Serves dual purpose as validation tool and example code
- Keeping it in `references/` maintains consistency with existing reference materials

## Risks / Trade-offs

### Risk 1: Type Synchronization Between Generators

**Risk**: The inject-js-types generator must stay in sync with the inject-js generator. If the runtime behavior changes but types don't update (or vice versa), developers will encounter mismatches.

**Mitigation**: 
- Add cross-generator consistency tests to verify factory/builder patterns match
- Run both generators in CI and compare their module lists
- Document the synchronization requirement in generator comments

### Risk 2: Extension Schema Typing Complexity

**Risk**: The extensionSchema parameter accepts both JSON string and typed array, which could lead to confusion.

**Mitigation**: 
- Provide clear JSDoc documentation for both options
- Include examples in the reference app showing both usage patterns
- Consider adding runtime validation helpers in future iterations

### Risk 3: Package Version Management

**Risk**: The package version needs to sync with the Firebolt API version from the AST, but npm has its own versioning.

**Mitigation**: 
- Automate version synchronization in the build process
- Use the AST version as the source of truth
- Document versioning strategy in the package README

### Trade-off: Single File vs Multiple Files

**Trade-off**: Single `firebolt-inject.d.ts` file is simpler to use but larger than per-module files.

**Decision**: Single file is preferred because:
- Matches the inject-js bundle structure (single file)
- Easier to distribute as a single npm package
- Simpler for consumers (one import vs multiple)
- Modern bundlers handle large type files efficiently

## Migration Plan

1. **Phase 1**: Create the generator and basic validation
   - Implement `inject-js-types.ts` generator
   - Add generator output tests
   - Generate initial `firebolt-inject.d.ts`

2. **Phase 2**: Package setup and reference app
   - Configure npm package structure
   - Create reference app with dev dependency
   - Add automated installation tests

3. **Phase 3**: Publishing and documentation
   - Configure GitHub Packages registry
   - Publish initial version
   - Create consumer documentation

4. **Phase 4**: Validation and refinement
   - Manual IDE testing via reference app
   - Gather feedback from early adopters
   - Refine based on real-world usage

**Rollback Strategy**: If issues arise, the existing per-module `.d.ts` files remain available and unaffected. The new package can be deprecated or updated without breaking existing users.

## Open Questions

1. **GitHub Packages Authentication**: What authentication mechanism will be used for publishing to GitHub Packages? (Personal access token, GitHub Actions token, etc.)

2. **Version Synchronization**: Should the package version exactly match the Firebolt API version, or use semantic versioning independently?

3. **IDE Compatibility**: Should we test compatibility with IDEs beyond VS Code (WebStorm, IntelliJ, etc.)?