/**
 * Generator infrastructure.
 *
 * A Generator receives a Module (one API surface) plus configuration and
 * returns a list of GeneratorOutput entries — one file per output path.
 */

import { Module } from "../ast/types";

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
// Registry
// ---------------------------------------------------------------------------

const registry = new Map<string, Generator>();

export function registerGenerator(id: string, gen: Generator): void {
  registry.set(id, gen);
}

export function getGenerator(id: string): Generator {
  const gen = registry.get(id);
  if (!gen) {
    throw new Error(`No generator registered for target "${id}"`);
  }
  return gen;
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
 */
export function runAll(
  modules: Module[],
  config: GenConfig,
  targets?: string[]
): GeneratorOutput[] {
  const ids = targets ?? listGenerators();
  const outputs: GeneratorOutput[] = [];

  for (const id of ids) {
    const gen = getGenerator(id);
    for (const module of modules) {
      outputs.push(...gen(module, config));
    }
  }

  return outputs;
}
