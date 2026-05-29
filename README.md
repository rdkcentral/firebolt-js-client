# firebolt-js-client
Implementation of Firebolt JavaScript Client.

---

## Firebolt API Header Generator

A build-time code generator that reads OpenRPC contracts for Firebolt 9 API modules and emits type-safe language headers for TypeScript, ReScript, Kotlin/JS, C++, and Python.


```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHORING LAYER                             │
│                                                                 │
│   openspec/specs/<capability>/spec.md                           │
│   "What does this API mean?"                                    │
│   Human language, intent, constraints, capabilities             │
└───────────────────────┬─────────────────────────────────────────┘
                        │ derives (deterministically)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CONTRACT LAYER                              │
│                                                                 │
│   openrpc.json                                                  │
│   "What exactly is this API?"                                   │
│   Method signatures, schemas, validation, versioning            │
└───────────────────────┬─────────────────────────────────────────┘
                        │ parses into
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     REPRESENTATION LAYER                        │
│                                                                 │
│   Canonical AST (language-neutral)                              │
│   "How do all languages see this API?"                          │
│   Typed tree of Modules, Methods, TypeDecls, TypeRefs           │
└───────────────────────┬─────────────────────────────────────────┘
                        │ emits
              ┌─────────┼──────────┬───────────┬──────────┐
              ▼         ▼          ▼           ▼          ▼
           .d.ts       .res        .kt         .hpp        .py
        TypeScript  ReScript  Kotlin/JS      C++        Python
```


```
┌──────────────────────────────────────────────────────────────────────┐
│                  What exists today                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  OpenRPC JSON ──► AST builder ──► CanonicalAST                       │
│                                          │                             │
│                                          ▼ (per-module)               │
│                              ┌─────────────────────┐                  │
│                              │  Generator registry  │                  │
│                              │  ts / res / kt /     │                  │
│                              │  cpp / py            │                  │
│                              └─────────────────────┘                  │
│                                          │                             │
│                                          ▼ (declaration files)         │
│                               Module.d.ts / .res / .kt...             │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                  What we need to add                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  CanonicalAST (all modules) ──► inject-js generator                  │
│                                          │                             │
│                                          ▼ (single runtime JS file)   │
│                               firebolt-inject.js                      │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘

```

### Pipeline

```
OpenSpec (.md)  →  OpenRPC (.json)  →  Canonical AST  →  Language Headers
    (human)         (derived/AI)         (in-memory)      (.d.ts, .res, .kt, .hpp, .pyi)
```

### Prerequisites

- **Node.js** 18+ with npm
- **TypeScript** (installed via `npm install`)
- Optional for output verification:
  - `tsc` — TypeScript
  - `rescript` — ReScript
  - `kotlinc-js` — Kotlin/JS
  - `g++ -std=c++17` — C++
  - `mypy --strict` — Python

### Quick Start

```bash
# Install dependencies
npm install

# Generate headers for all modules, all targets
npx ts-node src/cli.ts generate

# Generate specific modules + targets
npx ts-node src/cli.ts generate --modules Discovery,Lifecycle2 --targets ts,py

# With OpenRPC validation enabled
npx ts-node src/cli.ts generate --validate

# Custom output directory
npx ts-node src/cli.ts generate --outdir /my/output/dir
```

### Output Files

| Target | Output path pattern |
|--------|---------------------|
| TypeScript | `out/ts/<Module>.d.ts` |
| ReScript | `out/res/<Module>.res` |
| Kotlin/JS | `out/kt/<Module>.kt` |
| C++ | `out/cpp/firebolt/<Module>.hpp` |
| Python stub | `out/py/<module>.pyi` |
| Python protocol | `out/py/<module>_protocol.py` |

The C++ `result.hpp` is hand-authored and lives at `out/cpp/firebolt/result.hpp`.

### Running Tests

```bash
# All tests (builder unit tests + cross-generator consistency)
npm test
```

### Adding a New Module

1. **Author the spec** — create `openspec/specs/<module>/spec.md` following the format in `openspec/specs/_meta/spec-format.md`.

2. **Derive OpenRPC** — following `openspec/specs/_meta/openrpc-derivation.md`, create `src/openrpc/<module>.json`. Key rules:
   - Subscribe methods get a `listen: boolean` param injected
   - Subscribe result is `oneOf[ListenResponse, PayloadType]`
   - Enum values go in `components/schemas`

3. **Run the generator** — `npx ts-node src/cli.ts generate --modules <Module>`

4. **Verify outputs** — type-check/compile each target as appropriate.

### Adding a New Language Target

1. Create `src/generators/<lang>.ts`.

2. Implement the `Generator` function signature:
   ```ts
   (module: Module, config: GenConfig) => GeneratorOutput[]
   ```

3. At the bottom of the file, call:
   ```ts
   registerGenerator("<id>", generate);
   ```

4. Import the new generator in `src/cli.ts`:
   ```ts
   import "./generators/<lang>";
   ```

5. Pass the new target ID in the `--targets` option:
   ```bash
   npx ts-node src/cli.ts generate --targets ts,res,<id>
   ```

### Architecture

```
src/
├── ast/
│   ├── types.ts          # Canonical AST interfaces
│   ├── builder.ts        # buildAST(): OpenRPC[] → CanonicalAST (Rules 1–6)
│   └── builder.test.ts   # Unit tests for builder rules
├── generators/
│   ├── index.ts          # Generator type, registry, runAll()
│   ├── typescript.ts     # → .d.ts
│   ├── rescript.ts       # → .res
│   ├── kotlin.ts         # → .kt (Kotlin/JS only)
│   ├── cpp.ts            # → .hpp (C++17)
│   ├── python.ts         # → .pyi + _protocol.py
│   └── consistency.test.ts
├── openrpc/
│   ├── shared.json       # ListenResponse + FireboltError schemas
│   ├── discovery.json
│   └── lifecycle2.json
└── cli.ts                # CLI entry point

out/
├── ts/                   # TypeScript .d.ts
├── res/                  # ReScript .res
├── kt/                   # Kotlin .kt
├── cpp/firebolt/         # C++ .hpp + result.hpp
└── py/                   # Python .pyi + _protocol.py
```

```
                   CanonicalAST
                        │
              ┌─────────┴──────────┐
              │   Generator Host   │
              │  (TypeScript CLI)  │
              └─────────┬──────────┘
                        │ calls
           ┌────────────┼────────────┬──────────────┐
           ▼            ▼            ▼              ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
     │    ts    │ │    res   │ │    kt    │ │   cpp    │
     │generator │ │generator │ │generator │ │generator │
     └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Builder Rules Reference

| Rule | Description |
|------|-------------|
| 1 | Strip `ListenResponse` from `oneOf` in subscribe method results |
| 2 | Strip the `listen: boolean` param from subscribe methods |
| 3 | Derive `identifier` from `serializedId` (split on non-alphanumeric, PascalCase) |
| 4 | Resolve `$ref` to `NamedRef`; set `.module` for cross-module refs |
| 5 | Propagate `format: "date-time"` to `PrimitiveRef.format` (Python → `datetime`) |
| 6 | Inline anonymous result schemas → synthetic `TypeDecl` named `<Module><Method>Result` |


