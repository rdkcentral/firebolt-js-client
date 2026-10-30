import {
  ArrayAliasDecl,
  CanonicalAST,
  EnumTypeDecl,
  Method,
  Module,
  NamedRef,
  ObjectTypeDecl,
  OptionalRef,
  ScalarAliasDecl,
  TypeDecl,
  TypeRef,
  UnionTypeDecl,
  resolveMethodPlatform,
} from "../ast/types";
import sharedDocument from "../openrpc/shared.json";
import { buildAST } from "../ast/builder";
import { GenConfig, GeneratorOutput, registerFullASTGenerator } from "./index";
import fixtureOverrides from "../certification/fixture-overrides.json";

export interface CertificationMethod {
  module: string;
  method: string;
  name: string;
  kind: Method["kind"];
  args: unknown[];
}

type FixtureOverrides = Record<string, unknown[]>;

const sharedModules = buildAST([sharedDocument as never]).modules;

function typeKey(moduleName: string, typeName: string): string {
  return `${moduleName}.${typeName}`;
}

function getTypeDecl(
  ref: NamedRef,
  owner: Module,
  modulesByName: Map<string, Module>,
): { declaration: TypeDecl; module: Module } {
  const moduleName = ref.module ?? owner.name;
  const module = modulesByName.get(moduleName);
  const declaration = module?.types.find((type) => type.name === ref.name);
  if (!module || !declaration) {
    throw new Error(`Unable to resolve fixture type ${moduleName}.${ref.name}`);
  }
  return { declaration, module };
}

function fixtureValue(
  ref: TypeRef,
  owner: Module,
  modulesByName: Map<string, Module>,
  resolving: Set<string> = new Set(),
): unknown {
  switch (ref.kind) {
    case "optional":
      return fixtureValue((ref as OptionalRef).inner, owner, modulesByName, resolving);
    case "primitive": {
      const constraints = ref.constraints;
      if (ref.primitive === "bool") return false;
      if (ref.primitive === "unsigned" || ref.primitive === "double") {
        const minimum = constraints?.minimum ?? (ref.primitive === "unsigned" ? 0 : undefined);
        const maximum = constraints?.maximum;
        if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
          throw new Error(`Incompatible numeric constraints in ${owner.name}`);
        }
        return minimum ?? (maximum !== undefined && maximum < 0 ? maximum : 0);
      }
      return stringFixture(ref.format, constraints?.minLength, constraints?.maxLength, constraints?.pattern);
    }
    case "generic-object":
      return {};
    case "array":
      return [fixtureValue(ref.items, owner, modulesByName, resolving)];
    case "named": {
      const target = getTypeDecl(ref as NamedRef, owner, modulesByName);
      const key = typeKey(target.module.name, target.declaration.name);
      if (resolving.has(key)) {
        throw new Error(`Recursive fixture type ${key} requires an override`);
      }
      const nested = new Set(resolving);
      nested.add(key);
      return declarationValue(target.declaration, target.module, modulesByName, nested);
    }
    default:
      throw new Error(`Unsupported fixture type ${(ref as TypeRef).kind}`);
  }
}

function stringFixture(
  format?: string,
  minLength?: number,
  maxLength?: number,
  pattern?: string,
): string {
  const candidates = format === "date-time"
    ? ["2025-01-01T00:00:00.000Z"]
    : ["US", "CA", "en", "test", "certification", "x", ""];
  const minimum = minLength ?? 0;
  if (maxLength !== undefined && minimum > maxLength) {
    throw new Error("Incompatible string length constraints");
  }

  const regex = pattern ? new RegExp(pattern) : undefined;
  const value = candidates.find((candidate) => {
    return candidate.length >= minimum &&
      (maxLength === undefined || candidate.length <= maxLength) &&
      (!regex || regex.test(candidate));
  });
  if (value === undefined) {
    throw new Error(`Unable to synthesize string for pattern ${pattern ?? "(none)"}`);
  }
  return value;
}

function declarationValue(
  declaration: TypeDecl,
  owner: Module,
  modulesByName: Map<string, Module>,
  resolving: Set<string>,
): unknown {
  switch (declaration.kind) {
    case "enum": {
      const value = (declaration as EnumTypeDecl).values[0]?.serializedId;
      if (value === undefined) throw new Error(`Enum ${declaration.name} has no values`);
      return value;
    }
    case "object": {
      const result: Record<string, unknown> = {};
      for (const property of (declaration as ObjectTypeDecl).properties) {
        if (!property.required || property.type.kind === "optional") continue;
        result[property.name] = fixtureValue(property.type, owner, modulesByName, resolving);
      }
      return result;
    }
    case "array-alias":
      return [fixtureValue((declaration as ArrayAliasDecl).items, owner, modulesByName, resolving)];
    case "scalar-alias":
      return fixtureValue((declaration as ScalarAliasDecl).target, owner, modulesByName, resolving);
    case "union": {
      const variant = (declaration as UnionTypeDecl).variants[0];
      if (!variant) throw new Error(`Union ${declaration.name} has no variants`);
      return fixtureValue(variant, owner, modulesByName, resolving);
    }
    default:
      throw new Error(`Unsupported fixture declaration ${(declaration as TypeDecl).kind}`);
  }
}

function isPrimitiveWrapped(
  method: Method,
  module: Module,
  modulesByName: Map<string, Module>,
): boolean {
  if (method.params.length !== 1 || method.params[0].type.kind !== "named") return false;
  const { declaration } = getTypeDecl(method.params[0].type as NamedRef, module, modulesByName);
  return declaration.kind === "object" &&
    declaration.properties.length === 1 &&
    declaration.properties[0].required &&
    declaration.properties[0].type.kind === "primitive";
}

function methodArgs(
  method: Method,
  module: Module,
  modulesByName: Map<string, Module>,
  overrides: FixtureOverrides,
): unknown[] {
  const name = `${module.name}.${method.name}`;
  const override = overrides[name];
  if (override !== undefined) {
    if (!Array.isArray(override)) throw new Error(`Fixture override for ${name} must be an array`);
    return override;
  }
  if (method.kind === "subscribe" || method.params.length === 0) return [];

  const params: Record<string, unknown> = {};
  for (const param of method.params) {
    if (param.type.kind === "optional") continue;
    params[param.name] = fixtureValue(param.type, module, modulesByName);
  }

  if (isPrimitiveWrapped(method, module, modulesByName)) {
    const param = method.params[0];
    const declaration = getTypeDecl(param.type as NamedRef, module, modulesByName).declaration as ObjectTypeDecl;
    return [params[param.name] && (params[param.name] as Record<string, unknown>)[declaration.properties[0].name]];
  }
  return [params];
}

export function generateCertificationMethods(
  ast: CanonicalAST,
  overrides: FixtureOverrides = fixtureOverrides as FixtureOverrides,
): CertificationMethod[] {
  const modules = [...ast.modules, ...sharedModules];
  const modulesByName = new Map(modules.map((module) => [module.name, module]));
  const methods: CertificationMethod[] = [];

  for (const module of ast.modules) {
    if (module.platform === "native") continue;
    for (const method of module.methods) {
      if (resolveMethodPlatform(method, module) === "native") continue;
      const name = `${module.name}.${method.name}`;
      try {
        methods.push({
          module: module.name,
          method: method.name,
          name,
          kind: method.kind,
          args: methodArgs(method, module, modulesByName, overrides),
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to generate fixture for ${name}: ${detail}`);
      }
    }
  }
  return methods;
}

function generate(ast: CanonicalAST, _config: GenConfig): GeneratorOutput[] {
  const manifest = {
    version: ast.version,
    methods: generateCertificationMethods(ast),
  };
  return [{
    filePath: "certification/api-test-manifest.json",
    content: `${JSON.stringify(manifest, null, 2)}\n`,
  }];
}

registerFullASTGenerator("certification", generate, "web");