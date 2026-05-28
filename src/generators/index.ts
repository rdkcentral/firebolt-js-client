/**
 * Generator infrastructure.
 *
 * A Generator receives a Module (one API surface) plus configuration and
 * returns a list of GeneratorOutput entries — one file per output path.
 */

import { Constraints, Module, OptionalRef, Platform, PrimitiveRef, TypeRef } from "../ast/types";

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
// runAll helper
// ---------------------------------------------------------------------------

/**
 * Run all registered generators (or a filtered subset) against every module
 * in the AST.
 *
 * Platform filtering:
 *   - A "web" generator skips modules with platform "native"
 *   - A "native" generator skips modules with platform "web"
 *   - Modules with platform "both" are processed by all generators
 */
export function runAll(
  modules: Module[],
  config: GenConfig,
  targets?: string[]
): GeneratorOutput[] {
  const ids = targets ?? listGenerators();
  const outputs: GeneratorOutput[] = [];

  for (const id of ids) {
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
