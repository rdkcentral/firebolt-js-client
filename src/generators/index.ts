/**
 * Generator infrastructure.
 *
 * A Generator receives a Module (one API surface) plus configuration and
 * returns a list of GeneratorOutput entries — one file per output path.
 */

import { CanonicalAST, Constraints, Module, OptionalRef, Platform, PrimitiveRef, TypeRef } from "../ast/types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GenConfig {
  /** Absolute or relative path to root output directory */
  outDir: string;
}

/**
 * A single output file emitted by a generator.
 */
export interface GeneratorOutput {
  /** Path relative to outDir */
  filePath: string;
  content: string;
}

/**
 * A generator function: takes a Module and config, returns one or more files.
 */
export type Generator = (
  module: Module,
  config: GenConfig
) => GeneratorOutput[];

/**
 * A full-AST generator function: receives the entire CanonicalAST once per run
 * rather than one Module at a time. Used for generators that must emit a single
 * file covering all modules (e.g. inject-js).
 */
export type FullASTGenerator = (
  ast: CanonicalAST,
  config: GenConfig
) => GeneratorOutput[];

// ---------------------------------------------------------------------------
// Constraint utilities (used by multiple generators)
// ---------------------------------------------------------------------------

/**
 * Walk a TypeRef (unwrapping OptionalRef) and return the Constraints if
 * the innermost node is a constrained PrimitiveRef. Otherwise undefined.
 */
export function extractConstraints(ref: TypeRef): Constraints | undefined {
  if (ref.kind === "optional") return extractConstraints((ref as OptionalRef).inner);
  if (ref.kind === "primitive") return (ref as PrimitiveRef).constraints;
  return undefined;
}

/**
 * Format a Constraints object as a concise human-readable string.
 * E.g.  minLength=2, maxLength=2, pattern=^[A-Z]{2}$
 * E.g.  minimum=0.1, maximum=10
 */
export function formatConstraintNote(c: Constraints): string {
  const parts: string[] = [];
  if (c.minLength !== undefined) parts.push(`minLength=${c.minLength}`);
  if (c.maxLength !== undefined) parts.push(`maxLength=${c.maxLength}`);
  if (c.pattern   !== undefined) parts.push(`pattern=${c.pattern}`);
  if (c.minimum   !== undefined) parts.push(`minimum=${c.minimum}`);
  if (c.maximum   !== undefined) parts.push(`maximum=${c.maximum}`);
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

interface RegistryEntry {
  gen: Generator;
  /**
   * The runtime this generator targets.
   *   web    → runs only for modules with platform "web" | "both"
   *   native → runs only for modules with platform "native" | "both"
   */
  targetPlatform: Extract<Platform, "web" | "native">;
}

const registry = new Map<string, RegistryEntry>();

export function registerGenerator(
  id: string,
  gen: Generator,
  targetPlatform: Extract<Platform, "web" | "native">
): void {
  registry.set(id, { gen, targetPlatform });
}

export function getGenerator(id: string): Generator {
  const entry = registry.get(id);
  if (!entry) {
    throw new Error(`No generator registered for target "${id}"`);
  }
  return entry.gen;
}

export function listGenerators(): string[] {
  return Array.from(registry.keys());
}

// ---------------------------------------------------------------------------
// Full-AST registry
// ---------------------------------------------------------------------------

interface FullASTRegistryEntry {
  gen: FullASTGenerator;
  targetPlatform: Extract<Platform, "web" | "native">;
}

const fullASTRegistry = new Map<string, FullASTRegistryEntry>();

export function registerFullASTGenerator(
  id: string,
  gen: FullASTGenerator,
  targetPlatform: Extract<Platform, "web" | "native">
): void {
  fullASTRegistry.set(id, { gen, targetPlatform });
}

export function listFullASTGenerators(): string[] {
  return Array.from(fullASTRegistry.keys());
}

// ---------------------------------------------------------------------------
// runAll helper
// ---------------------------------------------------------------------------

/**
 * Run all registered per-module generators (or a filtered subset) against
 * every module in the AST.
 *
 * Platform filtering:
 *   - A "web" generator skips modules with platform "native"
 *   - A "native" generator skips modules with platform "web"
 *   - Modules with platform "both" are processed by all generators
 *
 * Targets registered as full-AST generators are silently skipped here;
 * call runAllFullAST() to dispatch them.
 */
export function runAll(
  modules: Module[],
  config: GenConfig,
  targets?: string[]
): GeneratorOutput[] {
  const ids = targets ?? listGenerators();
  const outputs: GeneratorOutput[] = [];

  for (const id of ids) {
    // Skip targets that belong to the full-AST registry
    if (fullASTRegistry.has(id)) continue;

    const entry = registry.get(id);
    if (!entry) {
      throw new Error(`No generator registered for target "${id}"`);
    }
    for (const module of modules) {
      // Skip if the module's platform doesn't include this generator's target
      if (
        module.platform !== "both" &&
        module.platform !== entry.targetPlatform
      ) {
        continue;
      }
      outputs.push(...entry.gen(module, config));
    }
  }

  return outputs;
}

/**
 * Run all registered full-AST generators (or a filtered subset) once,
 * passing the complete CanonicalAST.
 *
 * Targets registered as per-module generators are silently skipped here.
 * Targets not found in either registry throw an error.
 */
export function runAllFullAST(
  ast: CanonicalAST,
  config: GenConfig,
  targets?: string[]
): GeneratorOutput[] {
  const ids = targets ?? listFullASTGenerators();
  const outputs: GeneratorOutput[] = [];

  for (const id of ids) {
    // Skip targets that belong to the per-module registry
    if (registry.has(id)) continue;

    const entry = fullASTRegistry.get(id);
    if (!entry) {
      throw new Error(`No generator registered for target "${id}"`);
    }
    outputs.push(...entry.gen(ast, config));
  }

  return outputs;
}
