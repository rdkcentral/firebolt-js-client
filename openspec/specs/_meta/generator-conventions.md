# Generator Conventions — Language Mapping Rules

> **Meta-guideline.** This document defines how each language generator translates
> Canonical AST nodes into language-specific header output.
> Each generator is a pure function: `(ast: CanonicalAST, config) => Map<filename, content>`
>
> Generators must NOT perform semantic inference. Every decision in this document
> is the generator's complete specification. Unknown patterns are errors, not
> opportunities for the generator to guess.

---

## Generator Targets

| Target     | Extension  | Purpose                                                    |
|------------|------------|------------------------------------------------------------|
| TypeScript | `.d.ts`    | Declaration file for TypeScript/JavaScript consumers       |
| ReScript   | `.res`     | External bindings for ReScript (BuckleScript) consumers    |
| Kotlin/JS  | `.kt`      | External declarations for Kotlin/JS (browser target only)  |
| C++        | `.hpp`     | Native SDK headers, statically linkable                    |
| Python     | `.pyi`     | Type stub file for IDE static analysis                     |
| Python     | `.py`      | Abstract Protocol base class for runtime type checking     |

---

## Primitive Type Mapping

The AST `PrimitiveRef.primitive` field maps to each language as follows.

| AST primitive | TypeScript | ReScript  | Kotlin/JS  | C++              | Python (.pyi)  | Python (.py)   |
|---------------|------------|-----------|------------|------------------|----------------|----------------|
| `string`      | `string`   | `string`  | `String`   | `std::string`    | `str`          | `str`          |
| `boolean`     | `boolean`  | `bool`    | `Boolean`  | `bool`           | `bool`         | `bool`         |
| `integer`     | `number`   | `int`     | `Int`      | `int64_t`        | `int`          | `int`          |
| `number`      | `number`   | `float`   | `Double`   | `double`         | `float`        | `float`        |
| `null`        | `void`     | `unit`    | `Unit`     | `void`           | `None`         | `None`         |

> Note: `integer` in the AST covers both signed and unsigned. When the source spec
> type is `unsigned`, the AST carries a `ScalarAlias` or context flag. C++ generators
> emit `uint64_t` for unsigned contexts.

---

## Format Annotation Mapping (`PrimitiveRef.format`)

| AST format     | TypeScript  | ReScript  | Kotlin/JS  | C++            | Python (.pyi)      | Python (.py)       |
|----------------|-------------|-----------|------------|----------------|--------------------|--------------------|
| `"date-time"`  | `string`    | `string`  | `String`   | `std::string`  | `datetime`         | `datetime`         |

- TypeScript, ReScript, and Kotlin/JS treat `date-time` as a plain string (ISO 8601).
  The format annotation appears as a JSDoc/KDoc comment on the parameter or field.
- C++ treats `date-time` as a plain `std::string` in headers. Parsing is an
  implementation concern, not a header concern.
- Python `.pyi` and `.py` use `datetime.datetime` from the standard library.
  Import: `from datetime import datetime`

---

## Result Wrapping

Every `kind: "call"` method result is wrapped in the language's async/result type.
The AST `Method.result` carries the inner type `T`; the generator wraps it.

| Language       | Wrapping of `T`          | Wrapping of `void` (`null`) |
|----------------|--------------------------|-----------------------------|
| TypeScript     | `Promise<T>`             | `Promise<void>`             |
| ReScript       | `promise<t>`             | `promise<unit>`             |
| Kotlin/JS      | `Promise<T>`             | `Promise<Unit>`             |
| C++            | `FireboltResult<T>`      | `FireboltResult<void>`      |
| Python `.pyi`  | `Awaitable[T]`           | `Awaitable[None]`           |
| Python `.py`   | `T` (abstract return)    | `None` (abstract return)    |

---

## `FireboltResult<T>` — C++ Error Model

The C++ generator uses `FireboltResult<T>` as the return type for all `kind: "call"`
methods. It carries either a success value or a `FireboltError`.

The header must define (or include) these types in a shared Firebolt header:

```cpp
struct FireboltError {
    int         code;     // Firebolt error code 1–5 (see openrpc-derivation.md)
    std::string message;  // Human-readable description
};

template<typename T>
class FireboltResult {
public:
    bool            success()  const noexcept;
    const T&        value()    const;   // valid only if success() == true
    FireboltError   error()    const;   // valid only if success() == false
};

// Specialisation for void actions
template<>
class FireboltResult<void> {
public:
    bool          success() const noexcept;
    FireboltError error()   const;
};
```

Generators do not implement `FireboltResult` — they reference it.
The shared header is included via `#include "firebolt/result.hpp"` at the top of
every generated module header.

---

## Optional Parameter Pattern

When `Param.required == false`, each language has a specific idiom:

| Language    | Optional param idiom                                        |
|-------------|-------------------------------------------------------------|
| TypeScript  | `param?: T` (trailing `?`)                                  |
| ReScript    | `~param: t=?` (labelled optional arg with `=?`)             |
| Kotlin/JS   | `param: T = definedExternally`                              |
| C++         | `std::optional<T> param = std::nullopt`                     |
| Python      | `param: Optional[T] = None`                                 |

Required params always precede optional params in the generated signature.
This mirrors the spec authoring rule and the OpenRPC param order.

---

## Subscribe Kind — Callback + Unsubscribe Pattern

A `kind: "subscribe"` method is never emitted as a raw JSON-RPC call in generated
headers. Each language generates a callback registration function that returns
an unsubscribe token.

| Language    | Subscribe signature                                             | Unsubscribe token     |
|-------------|-----------------------------------------------------------------|-----------------------|
| TypeScript  | `(callback: (payload: T) => void) => () => void`                | `() => void`          |
| ReScript    | `(t => unit) => (unit => unit)`                                 | `unit => unit`        |
| Kotlin/JS   | `fun onX(callback: (T) -> Unit): () -> Unit`                    | `() -> Unit`          |
| C++         | `UnsubscribeFn onX(std::function<void(const T&)> callback)`     | `std::function<void()>` |
| Python      | `def onX(callback: Callable[[T], None]) -> Callable[[], None]`  | `Callable[[], None]`  |

---

## Enum Declaration

Each `EnumType` node generates a language-native enum construct.
The `EnumValue.identifier` is used as the member name.
The `EnumValue.serializedId` is the wire/JSON value and is encoded as needed.

### TypeScript
```typescript
// String literal union — no runtime enum overhead
type LifecycleState =
  | "initializing"
  | "paused"
  | "active"
  | "suspended"
  | "hibernated"
  | "terminating";

// When serializedId ≠ identifier, still use the wire string as the union member
type AgePolicy =
  | "app:adult"
  | "app:child"
  | "app:teen";
```

### ReScript
```rescript
// Use @as decorator to preserve wire value; variant name uses identifier
type agePolicy =
  | @as("app:adult")  AppAdult
  | @as("app:child")  AppChild
  | @as("app:teen")   AppTeen
```

### Kotlin/JS
```kotlin
// Kotlin enum — identifier as member name, wire value as constructor arg
enum class AgePolicy(val value: String) {
    AppAdult("app:adult"),
    AppChild("app:child"),
    AppTeen("app:teen")
}

// Simple enum (no colon/dot in wire values) — no value arg needed
enum class LifecycleState {
    initializing, paused, active, suspended, hibernated, terminating
}
```

### C++
```cpp
// Enum class — identifier as member, doc comment carries wire value
enum class AgePolicy {
    AppAdult,   // wire: "app:adult"
    AppChild,   // wire: "app:child"
    AppTeen     // wire: "app:teen"
};
```

### Python
```python
# str Enum — identifier is the Python name, serializedId is the value
from enum import Enum

class AgePolicy(str, Enum):
    AppAdult = "app:adult"
    AppChild = "app:child"
    AppTeen  = "app:teen"
```

---

## Object / Struct Declaration

Each `ObjectType` node generates a language-native struct or record.
Required fields are always present; optional fields use the language's
optional/nullable idiom.

| Language    | Object construct        | Required field   | Optional field         |
|-------------|-------------------------|------------------|------------------------|
| TypeScript  | `interface`             | `name: T`        | `name?: T`             |
| ReScript    | `type t = { ... }`      | `name: t`        | `name: option<t>`      |
| Kotlin/JS   | `external interface`    | `val name: T`    | `val name: T?`         |
| C++         | `struct`                | `T name`         | `std::optional<T> name`|
| Python      | `TypedDict` (`.pyi`)    | `name: T`        | `name: NotRequired[T]` |
| Python      | `dataclass` (`.py`)     | `name: T`        | `name: Optional[T]`    |

---

## Module Namespace

Each `Module` becomes a namespace/object/class in the target language.

| Language    | Module construct                    | Example                     |
|-------------|-------------------------------------|-----------------------------|
| TypeScript  | `declare namespace Device { ... }`  | `Device.model()`            |
| ReScript    | `module Device = { ... }`           | `Device.model()`            |
| Kotlin/JS   | `external object Device { ... }`    | `Device.model()`            |
| C++         | `namespace Firebolt::Device { ... }`| `Firebolt::Device::model()` |
| Python      | `class Device: ...` (static methods)| `Device.model()`            |

---

## File Output Mapping

One output file per module, per language target.

| Language    | File path                              |
|-------------|----------------------------------------|
| TypeScript  | `generated/ts/<module>.d.ts`           |
| ReScript    | `generated/res/<module>.res`           |
| Kotlin/JS   | `generated/kt/<module>.kt`             |
| C++         | `generated/cpp/firebolt/<module>.hpp`  |
| Python stub | `generated/py/<module>.pyi`            |
| Python base | `generated/py/<module>_protocol.py`    |

C++ headers include a shared header:
```cpp
#include "firebolt/result.hpp"   // FireboltResult<T>, FireboltError
```

---

## Complete Generated Output — Worked Example

For the two worked methods (`Discovery.watched`, `Lifecycle2.onStateChanged`):

### TypeScript (`generated/ts/Discovery.d.ts`)
```typescript
type AgePolicy = "app:adult" | "app:child" | "app:teen";

declare namespace Discovery {
  function watched(
    entityId:  string,
    progress?: number,
    completed?: boolean,
    watchedOn?: string,
    agePolicy?: AgePolicy
  ): Promise<void>;
}
```

### TypeScript (`generated/ts/Lifecycle2.d.ts`)
```typescript
type LifecycleState =
  | "initializing" | "paused"     | "active"
  | "suspended"    | "hibernated" | "terminating";

interface StateChangedEvent {
  oldState: LifecycleState;
  newState: LifecycleState;
}

declare namespace Lifecycle2 {
  function onStateChanged(
    callback: (event: StateChangedEvent) => void
  ): () => void;
}
```

### ReScript (`generated/res/Discovery.res`)
```rescript
type agePolicy =
  | @as("app:adult") AppAdult
  | @as("app:child") AppChild
  | @as("app:teen")  AppTeen

module Discovery = {
  @val external watched: (
    ~entityId:  string,
    ~progress:  float=?,
    ~completed: bool=?,
    ~watchedOn: string=?,
    ~agePolicy: agePolicy=?,
    unit
  ) => promise<unit> = "Discovery.watched"
}
```

### ReScript (`generated/res/Lifecycle2.res`)
```rescript
type lifecycleState =
  | @as("initializing") Initializing
  | @as("paused")       Paused
  | @as("active")       Active
  | @as("suspended")    Suspended
  | @as("hibernated")   Hibernated
  | @as("terminating")  Terminating

type stateChangedEvent = {
  oldState: lifecycleState,
  newState: lifecycleState,
}

module Lifecycle2 = {
  @val external onStateChanged: (
    stateChangedEvent => unit
  ) => (unit => unit) = "Lifecycle2.onStateChanged"
}
```

### Kotlin/JS (`generated/kt/Discovery.kt`)
```kotlin
enum class AgePolicy(val value: String) {
    AppAdult("app:adult"),
    AppChild("app:child"),
    AppTeen("app:teen")
}

external object Discovery {
    fun watched(
        entityId:  String,
        progress:  Double  = definedExternally,
        completed: Boolean = definedExternally,
        watchedOn: String  = definedExternally,
        agePolicy: String  = definedExternally
    ): Promise<Unit>
}
```

### Kotlin/JS (`generated/kt/Lifecycle2.kt`)
```kotlin
enum class LifecycleState {
    initializing, paused, active, suspended, hibernated, terminating
}

external interface StateChangedEvent {
    val oldState: String
    val newState: String
}

external object Lifecycle2 {
    fun onStateChanged(
        callback: (StateChangedEvent) -> Unit
    ): () -> Unit
}
```

### C++ (`generated/cpp/firebolt/Discovery.hpp`)
```cpp
#pragma once
#include <optional>
#include <string>
#include "firebolt/result.hpp"

namespace Firebolt::Discovery {

enum class AgePolicy {
    AppAdult,   // wire: "app:adult"
    AppChild,   // wire: "app:child"
    AppTeen     // wire: "app:teen"
};

FireboltResult<void> watched(
    const std::string&              entityId,
    std::optional<double>           progress  = std::nullopt,
    std::optional<bool>             completed = std::nullopt,
    std::optional<std::string>      watchedOn = std::nullopt,
    std::optional<AgePolicy>        agePolicy = std::nullopt
);

} // namespace Firebolt::Discovery
```

### C++ (`generated/cpp/firebolt/Lifecycle2.hpp`)
```cpp
#pragma once
#include <functional>
#include <string>
#include "firebolt/result.hpp"

namespace Firebolt::Lifecycle2 {

enum class LifecycleState {
    Initializing, Paused, Active, Suspended, Hibernated, Terminating
};

struct StateChangedEvent {
    LifecycleState oldState;
    LifecycleState newState;
};

using UnsubscribeFn = std::function<void()>;

UnsubscribeFn onStateChanged(
    std::function<void(const StateChangedEvent&)> callback
);

} // namespace Firebolt::Lifecycle2
```

### Python stub (`generated/py/discovery.pyi`)
```python
from __future__ import annotations
from typing import Optional, Awaitable
from enum import Enum

class AgePolicy(str, Enum):
    AppAdult = "app:adult"
    AppChild = "app:child"
    AppTeen  = "app:teen"

class Discovery:
    @staticmethod
    def watched(
        entityId:  str,
        progress:  Optional[float] = None,
        completed: Optional[bool]  = None,
        watchedOn: Optional[str]   = None,
        agePolicy: Optional[AgePolicy] = None,
    ) -> Awaitable[None]: ...
```

### Python stub (`generated/py/lifecycle2.pyi`)
```python
from __future__ import annotations
from typing import Callable, Awaitable
from enum import Enum

class LifecycleState(str, Enum):
    initializing = "initializing"
    paused       = "paused"
    active       = "active"
    suspended    = "suspended"
    hibernated   = "hibernated"
    terminating  = "terminating"

class StateChangedEvent:
    oldState: LifecycleState
    newState: LifecycleState

class Lifecycle2:
    @staticmethod
    def onStateChanged(
        callback: Callable[[StateChangedEvent], None]
    ) -> Callable[[], None]: ...
```

### Python abstract base (`generated/py/lifecycle2_protocol.py`)
```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Callable
from .lifecycle2 import LifecycleState, StateChangedEvent

class Lifecycle2Protocol(ABC):
    @abstractmethod
    def on_state_changed(
        self,
        callback: Callable[[StateChangedEvent], None]
    ) -> Callable[[], None]: ...
```
