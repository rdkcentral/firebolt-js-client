/**
 * AST Builder — constructs a CanonicalAST from a list of OpenRPC documents.
 *
 * Rules (from openspec/specs/_meta/canonical-ast.md):
 *   Rule 1: Strip ListenResponse from oneOf subscribe results.
 *   Rule 2: Strip the `listen` param from subscribe methods.
 *   Rule 3: Derive identifier from serializedId (split on non-alphanumeric, PascalCase).
 *   Rule 4: Resolve $ref to NamedRef; populate module for cross-module refs.
 *   Rule 5: Propagate format:"date-time" to PrimitiveRef.format.
 *   Rule 6: Detect inline anonymous schemas; create synthetic TypeDecl named <Module><Method>Result; emit warning.
 *   Rule 7: Propagate minLength/maxLength/pattern (strings) and minimum/maximum (numbers) from schemas to PrimitiveRef.constraints.
 */

import {
  CanonicalAST,
  EnumTypeDecl,
  EnumValue,
  Method,
  MethodKind,
  Module,
  NamedRef,
  ObjectProperty,
  ObjectTypeDecl,
  OptionalRef,
  Param,
  Platform,
  PrimitiveKind,
  PrimitiveRef,
  Constraints,
  TypeDecl,
  TypeRef,
} from "./types";

// ---------------------------------------------------------------------------
// Types for raw OpenRPC JSON (minimal, just what we need)
// ---------------------------------------------------------------------------

interface OpenRPCInfo {
  title: string;
  version: string;
  /** Required — must be "web" | "native" | "both" */
  "x-firebolt-platform"?: string;
}

interface OpenRPCSchema {
  type?: string;
  format?: string;
  enum?: unknown[];
  properties?: Record<string, OpenRPCSchema | RefSchema>;
  required?: string[];
  items?: OpenRPCSchema | RefSchema;
  oneOf?: Array<OpenRPCSchema | RefSchema>;
  description?: string;
  title?: string;
  $ref?: string;
  // String constraint keywords (Rule 7)
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  // Numeric constraint keywords (Rule 7)
  minimum?: number;
  maximum?: number;
}

interface RefSchema {
  $ref: string;
}

function isRefSchema(s: unknown): s is RefSchema {
  return typeof s === "object" && s !== null && "$ref" in s;
}

interface OpenRPCParam {
  name: string;
  required?: boolean;
  schema: OpenRPCSchema | RefSchema;
  description?: string;
}

interface OpenRPCResult {
  name: string;
  schema: OpenRPCSchema | RefSchema;
  description?: string;
}

interface OpenRPCMethod {
  name: string;
  summary?: string;
  description?: string;
  params: OpenRPCParam[];
  result: OpenRPCResult;
  tags?: Array<{ name: string }>;
}

interface OpenRPCComponents {
  schemas?: Record<string, OpenRPCSchema>;
}

export interface OpenRPCDocument {
  openrpc: string;
  info: OpenRPCInfo;
  methods: OpenRPCMethod[];
  components?: OpenRPCComponents;
}

const VALID_PLATFORMS: readonly string[] = ["web", "native", "both"];

function parsePlatform(doc: OpenRPCDocument): Platform {
  const raw = doc.info["x-firebolt-platform"];
  if (!raw) {
    throw new Error(
      `OpenRPC document "${doc.info.title}" is missing required field info["x-firebolt-platform"]. ` +
        `Every module spec MUST declare a platform (web | native | both).`
    );
  }
  if (!VALID_PLATFORMS.includes(raw)) {
    throw new Error(
      `OpenRPC document "${doc.info.title}" has invalid x-firebolt-platform "${raw}". ` +
        `Valid values: ${VALID_PLATFORMS.join(", ")}.`
    );
  }
  return raw as Platform;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Build a CanonicalAST from one or more OpenRPC documents.
 * The `version` field is taken from the first document.
 */
export function buildAST(documents: OpenRPCDocument[]): CanonicalAST {
  if (documents.length === 0) {
    throw new Error("buildAST: at least one OpenRPC document is required");
  }

  const version = documents[0].info.version;
  const modules: Module[] = documents.map((doc) => buildModule(doc));

  return { version, modules };
}

// ---------------------------------------------------------------------------
// Module builder
// ---------------------------------------------------------------------------

function buildModule(doc: OpenRPCDocument): Module {
  const moduleName = doc.info.title;
  const platform = parsePlatform(doc);
  const schemas = doc.components?.schemas ?? {};

  // Collect type declarations from schemas
  const types: TypeDecl[] = [];
  for (const [name, schema] of Object.entries(schemas)) {
    const decl = buildTypeDecl(name, schema);
    if (decl !== null) {
      types.push(decl);
    }
  }

  // Collect methods (synthetic types from Rule 6 may push more into types)
  const syntheticTypes: TypeDecl[] = [];
  const methods: Method[] = doc.methods.map((m) =>
    buildMethod(m, moduleName, schemas, syntheticTypes)
  );

  return { name: moduleName, platform, types: [...types, ...syntheticTypes], methods };
}

// ---------------------------------------------------------------------------
// Method builder
// ---------------------------------------------------------------------------

function buildMethod(
  raw: OpenRPCMethod,
  moduleName: string,
  schemas: Record<string, OpenRPCSchema>,
  syntheticTypes: TypeDecl[]
): Method {
  // Determine method kind — subscribe methods have a `listen` param
  const hasListenParam = raw.params.some((p) => p.name === "listen");
  const kind: MethodKind = hasListenParam ? "subscribe" : "call";

  // Rule 2: strip the `listen` param from subscribe methods
  const filteredParams = hasListenParam
    ? raw.params.filter((p) => p.name !== "listen")
    : raw.params;

  const methodBaseName = raw.name.includes(".")
    ? raw.name.split(".")[1]
    : raw.name;

  // Build params
  const params: Param[] = filteredParams.map((p) =>
    buildParam(p, schemas)
  );

  // Build result (Rule 1 + Rule 6)
  const result = buildResult(
    raw.result,
    kind,
    moduleName,
    methodBaseName,
    schemas,
    syntheticTypes
  );

  const description = raw.description ?? raw.summary ?? "";
  return { name: methodBaseName, kind, params, result, description };
}

// ---------------------------------------------------------------------------
// Param builder
// ---------------------------------------------------------------------------

function buildParam(
  raw: OpenRPCParam,
  schemas: Record<string, OpenRPCSchema>
): Param {
  const innerType = resolveTypeRef(raw.schema, schemas);
  // Wrap in OptionalRef if not required
  const type: TypeRef =
    raw.required === false
      ? ({ kind: "optional", inner: innerType } satisfies OptionalRef)
      : innerType;

  return {
    name: raw.name,
    type,
    description: raw.description ?? "",
  };
}

// ---------------------------------------------------------------------------
// Result builder (Rule 1 + Rule 6)
// ---------------------------------------------------------------------------

function buildResult(
  raw: OpenRPCResult,
  kind: MethodKind,
  moduleName: string,
  methodBaseName: string,
  schemas: Record<string, OpenRPCSchema>,
  syntheticTypes: TypeDecl[]
): TypeRef | null {
  const schema = raw.schema;

  // null result
  if (!isRefSchema(schema) && schema.type === "null") {
    return null;
  }

  // Rule 1: for subscribe methods, unwrap oneOf and strip ListenResponse
  if (
    kind === "subscribe" &&
    !isRefSchema(schema) &&
    Array.isArray(schema.oneOf)
  ) {
    const variants = schema.oneOf.filter((v) => {
      if (isRefSchema(v)) {
        const refName = extractRefName(v.$ref);
        return refName !== "ListenResponse";
      }
      return (v as OpenRPCSchema).title !== "ListenResponse";
    });

    if (variants.length === 0) {
      return null;
    }

    if (variants.length === 1) {
      return resolveTypeRef(variants[0], schemas);
    }

    // Multiple non-ListenResponse variants — resolve each
    return resolveTypeRef(variants[0], schemas);
  }

  const resolved = resolveTypeRef(schema, schemas);

  // Rule 6: detect inline anonymous object schema → create synthetic TypeDecl
  if (
    !isRefSchema(schema) &&
    schema.type === "object" &&
    !schema.title
  ) {
    const syntheticName = `${moduleName}${capitalize(methodBaseName)}Result`;
    console.warn(
      `[Rule 6] Inline anonymous result schema for ${moduleName}.${methodBaseName} — ` +
        `creating synthetic TypeDecl "${syntheticName}"`
    );
    const syntheticDecl = buildTypeDecl(syntheticName, schema);
    if (syntheticDecl !== null) {
      syntheticTypes.push(syntheticDecl);
    }
    return { kind: "named", name: syntheticName } satisfies NamedRef;
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// TypeDecl builder
// ---------------------------------------------------------------------------

function buildTypeDecl(name: string, schema: OpenRPCSchema): TypeDecl | null {
  const description = schema.description ?? "";

  // Enum
  if (Array.isArray(schema.enum)) {
    const values: EnumValue[] = schema.enum.map((v) => {
      const serializedId = String(v);
      const identifier = deriveIdentifier(serializedId);
      return { serializedId, identifier, description: "" };
    });

    // Rule 3: check for identifier collisions
    const seen = new Set<string>();
    for (const v of values) {
      if (seen.has(v.identifier)) {
        throw new Error(
          `[Rule 3] Enum "${name}" has duplicate derived identifier "${v.identifier}" ` +
            `(from serializedId "${v.serializedId}")`
        );
      }
      seen.add(v.identifier);
    }

    return {
      kind: "enum",
      name,
      values,
      description,
    } satisfies EnumTypeDecl;
  }

  // Object
  if (schema.type === "object" && schema.properties) {
    const requiredFields = new Set(schema.required ?? []);
    const properties: ObjectProperty[] = Object.entries(schema.properties).map(
      ([propName, propSchema]) => {
        const required = requiredFields.has(propName);
        const innerType = resolveTypeRef(propSchema, {});
        const type: TypeRef = required
          ? innerType
          : ({ kind: "optional", inner: innerType } satisfies OptionalRef);
        return {
          name: propName,
          type,
          required,
          description:
            isRefSchema(propSchema)
              ? ""
              : (propSchema as OpenRPCSchema).description ?? "",
        };
      }
    );

    return {
      kind: "object",
      name,
      properties,
      description,
    } satisfies ObjectTypeDecl;
  }

  // Other schemas we don't need for the PoC
  return null;
}

// ---------------------------------------------------------------------------
// TypeRef resolution
// ---------------------------------------------------------------------------

function resolveTypeRef(
  schema: OpenRPCSchema | RefSchema,
  _schemas: Record<string, OpenRPCSchema>
): TypeRef {
  // Rule 4: $ref → NamedRef
  if (isRefSchema(schema)) {
    const refName = extractRefName(schema.$ref);
    // Cross-module refs include a filename prefix like "shared.json#/..."
    const moduleName = extractRefModule(schema.$ref);
    const ref: NamedRef = { kind: "named", name: refName };
    if (moduleName) {
      ref.module = moduleName;
    }
    return ref;
  }

  // Array
  if (schema.type === "array" && schema.items) {
    return { kind: "array", items: resolveTypeRef(schema.items, _schemas) };
  }

  // Primitive (Rule 5: propagate format; Rule 7: propagate value constraints)
  const primitive = jsonTypeToPrimitive(schema.type ?? "string");
  const ref: PrimitiveRef = { kind: "primitive", primitive };
  if (schema.format) {
    ref.format = schema.format;
  }
  // Rule 7: propagate constraints per primitive kind
  const c: Constraints = {};
  let hasConstraint = false;
  if (primitive === "string") {
    if (schema.minLength !== undefined) { c.minLength = schema.minLength; hasConstraint = true; }
    if (schema.maxLength !== undefined) { c.maxLength = schema.maxLength; hasConstraint = true; }
    if (schema.pattern   !== undefined) { c.pattern   = schema.pattern;   hasConstraint = true; }
  } else if (primitive === "double" || primitive === "unsigned") {
    if (schema.minimum !== undefined) { c.minimum = schema.minimum; hasConstraint = true; }
    if (schema.maximum !== undefined) { c.maximum = schema.maximum; hasConstraint = true; }
  }
  if (hasConstraint) ref.constraints = c;
  return ref;
}

// ---------------------------------------------------------------------------
// Rule 3: identifier derivation
// ---------------------------------------------------------------------------

/**
 * Derive a language-safe PascalCase identifier from a wire serialized value.
 *
 * Algorithm:
 *   1. Split on every character that is not a letter or digit.
 *   2. For each part: capitalise first letter, lowercase the rest — except
 *      sequences of digits are kept as-is.
 *   3. Concatenate.
 *
 * Examples:
 *   "app:adult"       → "AppAdult"
 *   "app:child"       → "AppChild"
 *   "dolbyDigital5.1" → "DolbyDigital51"
 *   "initializing"    → "Initializing"
 */
export function deriveIdentifier(serializedId: string): string {
  const parts = serializedId.split(/[^a-zA-Z0-9]+/).filter((p) => p.length > 0);
  return parts
    .map((part) => {
      if (/^\d+$/.test(part)) {
        // All digits — keep as-is
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractRefName(ref: string): string {
  // "#/components/schemas/AgePolicy" → "AgePolicy"
  // "shared.json#/components/schemas/ListenResponse" → "ListenResponse"
  const parts = ref.split("/");
  return parts[parts.length - 1];
}

function extractRefModule(ref: string): string | undefined {
  // "shared.json#/components/schemas/ListenResponse" → "Shared"
  if (!ref.startsWith("#")) {
    const filename = ref.split("#")[0]; // e.g. "shared.json"
    const base = filename.replace(/\.json$/, "");
    return capitalize(base);
  }
  return undefined;
}

function jsonTypeToPrimitive(jsonType: string): PrimitiveKind {
  switch (jsonType) {
    case "boolean":
      return "bool";
    case "number":
    case "double":
      return "double";
    case "integer":
      return "unsigned";
    default:
      return "string";
  }
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
