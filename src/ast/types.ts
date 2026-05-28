/**
 * Canonical AST — language-neutral representation of a Firebolt API surface.
 * All interfaces are derived from openspec/specs/_meta/canonical-ast.md.
 */

// ---------------------------------------------------------------------------
// Top-level
// ---------------------------------------------------------------------------

export interface CanonicalAST {
  /** Semver string taken from the OpenRPC document info.version field */
  version: string;
  modules: Module[];
}

/**
 * Platform classification for a module.
 *   web    — available to web-based runtimes only  → generators: ts, res, kt
 *   native — available to native SDK integrations only → generators: cpp, py
 *   both   — available to all runtimes → all generators
 *
 * Every spec MUST declare a platform. This is enforced by the AST builder.
 */
export type Platform = "web" | "native" | "both";

export interface Module {
  /** PascalCase module name, e.g. "Discovery", "Lifecycle2" */
  name: string;
  /**
   * Platform classification. Derived from `x-firebolt-platform` in the
   * OpenRPC document's `info` object. Generators use this to skip modules
   * that don't target their runtime.
   */
  platform: Platform;
  types: TypeDecl[];
  methods: Method[];
}

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

export type MethodKind = "call" | "subscribe";

export interface Method {
  /** Method name without the module prefix, e.g. "watched", "onStateChanged" */
  name: string;
  kind: MethodKind;
  /**
   * Already stripped of the `listen` param (Rule 2).
   * Optional params use OptionalRef as their type.
   */
  params: Param[];
  /**
   * Return type after Rule 1 (ListenResponse stripped from oneOf).
   * null means the method returns void/null/unit in all languages.
   */
  result: TypeRef | null;
  description: string;
}

export interface Param {
  name: string;
  type: TypeRef;
  description: string;
}

// ---------------------------------------------------------------------------
// Type declarations
// ---------------------------------------------------------------------------

export type TypeDecl =
  | EnumTypeDecl
  | ObjectTypeDecl
  | UnionTypeDecl
  | ArrayAliasDecl
  | ScalarAliasDecl;

export interface EnumTypeDecl {
  kind: "enum";
  name: string;
  values: EnumValue[];
  description: string;
}

export interface ObjectTypeDecl {
  kind: "object";
  name: string;
  properties: ObjectProperty[];
  description: string;
}

export interface ObjectProperty {
  name: string;
  type: TypeRef;
  required: boolean;
  description: string;
}

export interface UnionTypeDecl {
  kind: "union";
  name: string;
  variants: TypeRef[];
  description: string;
}

export interface ArrayAliasDecl {
  kind: "array-alias";
  name: string;
  items: TypeRef;
  description: string;
}

export interface ScalarAliasDecl {
  kind: "scalar-alias";
  name: string;
  target: TypeRef;
  description: string;
}

// ---------------------------------------------------------------------------
// Enum values
// ---------------------------------------------------------------------------

export interface EnumValue {
  /**
   * The wire-serialised string exactly as it appears in the OpenRPC `enum` array.
   * E.g. "app:adult"
   */
  serializedId: string;
  /**
   * PascalCase identifier derived from serializedId by splitting on every
   * non-alphanumeric character, capitalising each part, joining.
   * E.g. "app:adult" → "AppAdult", "dolbyDigital5.1" → "DolbyDigital51"
   */
  identifier: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Type references
// ---------------------------------------------------------------------------

export type TypeRef =
  | PrimitiveRef
  | NamedRef
  | ArrayRef
  | OptionalRef;

export type PrimitiveKind = "bool" | "string" | "unsigned" | "double";

/**
 * Validation constraints on a primitive value (Rule 7).
 * Derived from JSON Schema keywords. Only fields relevant to the primitive kind
 * should be present:
 *   string          → minLength, maxLength, pattern
 *   double/unsigned → minimum, maximum
 */
export interface Constraints {
  // String constraints
  /** Minimum character count (inclusive) */
  minLength?: number;
  /** Maximum character count (inclusive) */
  maxLength?: number;
  /** ECMAScript regular expression the full value must match */
  pattern?: string;
  // Numeric constraints
  /** Inclusive lower bound */
  minimum?: number;
  /** Inclusive upper bound */
  maximum?: number;
}

export interface PrimitiveRef {
  kind: "primitive";
  primitive: PrimitiveKind;
  /**
   * Propagated from the OpenRPC schema `format` field (Rule 5).
   * Currently used: "date-time" — Python generator promotes to datetime.
   */
  format?: string;
  /**
   * Validation constraints (Rule 7).
   * Present only when at least one constraint was declared in the spec /
   * OpenRPC schema. See Constraints for which fields apply to each kind.
   */
  constraints?: Constraints;
}

export interface NamedRef {
  kind: "named";
  /** The TypeDecl name this ref resolves to */
  name: string;
  /**
   * Present only for cross-module references.
   * E.g. if Lifecycle2 references Shared.FireboltError, module = "Shared"
   */
  module?: string;
}

export interface ArrayRef {
  kind: "array";
  items: TypeRef;
}

/**
 * Wraps the underlying type when the corresponding param/property has
 * required === false.  Generators map this to language-specific optional idioms.
 */
export interface OptionalRef {
  kind: "optional";
  inner: TypeRef;
}
