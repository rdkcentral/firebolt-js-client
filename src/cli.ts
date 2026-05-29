#!/usr/bin/env ts-node
/**
 * Firebolt API header generator CLI.
 *
 * Usage:
 *   npx ts-node src/cli.ts generate [options]
 *
 * Options:
 *   --modules <list>   Comma-separated list of module names (default: all)
 *   --targets <list>   Comma-separated generator IDs: ts,res,kt,cpp,py (default: all)
 *   --outdir  <path>   Output root directory (default: out)
 *   --validate         Validate OpenRPC documents before building AST
 */

import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import { buildAST, OpenRPCDocument } from "./ast/builder";
import { GenConfig, runAll, runAllFullAST } from "./generators/index";

// Register all generators by importing their modules (side-effect: registerGenerator calls)
import "./generators/typescript";
import "./generators/rescript";
import "./generators/kotlin";
import "./generators/cpp";
import "./generators/python";
import "./generators/inject-js";

// ---------------------------------------------------------------------------
// CLI definition
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name("firebolt-gen")
  .description("Generate Firebolt 9 API language headers from OpenRPC contracts")
  .version("0.1.0");

program
  .command("generate")
  .description("Run the full pipeline: OpenRPC → AST → language headers")
  .option(
    "--modules <modules>",
    'Comma-separated module names, e.g. "Discovery,Lifecycle2" (default: all in src/openrpc/)',
    ""
  )
  .option(
    "--targets <targets>",
    'Comma-separated generator IDs: ts,res,kt,cpp,py (default: all)',
    ""
  )
  .option("--outdir <outdir>", "Output root directory", "out")
  .option("--validate", "Validate OpenRPC documents before building", false)
  .action(
    (opts: {
      modules: string;
      targets: string;
      outdir: string;
      validate: boolean;
    }) => {
      try {
        run(opts);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`error: ${msg}\n`);
        process.exit(1);
      }
    }
  );

program.parse(process.argv);

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

function run(opts: {
  modules: string;
  targets: string;
  outdir: string;
  validate: boolean;
}): void {
  const openrpcDir = path.resolve("src/openrpc");
  const outDir = path.resolve(opts.outdir);

  // Determine which module files to load
  const allFiles = fs
    .readdirSync(openrpcDir)
    .filter((f) => f.endsWith(".json") && f !== "shared.json");

  const moduleFilter = opts.modules
    ? new Set(opts.modules.split(",").map((m) => m.trim().toLowerCase()))
    : null;

  const moduleFiles = allFiles.filter((f) => {
    if (!moduleFilter) return true;
    return moduleFilter.has(f.replace(/\.json$/, "").toLowerCase());
  });

  if (moduleFiles.length === 0) {
    throw new Error(`No module files found matching: ${opts.modules || "(all)"}`);
  }

  // Load and optionally validate documents
  const documents: OpenRPCDocument[] = moduleFiles.map((file) => {
    const filePath = path.join(openrpcDir, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    let doc: OpenRPCDocument;
    try {
      doc = JSON.parse(raw) as OpenRPCDocument;
    } catch (e) {
      throw new Error(`Failed to parse ${file}: ${(e as Error).message}`);
    }

    if (opts.validate) {
      validateOpenRPC(doc, file);
    }

    return doc;
  });

  // Build AST
  const ast = buildAST(documents);
  console.log(`Built AST: ${ast.modules.length} module(s), version ${ast.version}`);

  // Run generators
  const targets = opts.targets
    ? opts.targets.split(",").map((t) => t.trim())
    : undefined;

  const config: GenConfig = { outDir };
  const outputs = runAll(ast.modules, config, targets);
  const fullASTOutputs = runAllFullAST(ast, config, targets);

  // Write files
  for (const output of [...outputs, ...fullASTOutputs]) {
    const fullPath = path.join(outDir, output.filePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, output.content, "utf-8");
    console.log(`  wrote ${output.filePath}`);
  }

  console.log(`Done. ${outputs.length + fullASTOutputs.length} file(s) written to ${outDir}`);
}

// ---------------------------------------------------------------------------
// Minimal OpenRPC validation
// ---------------------------------------------------------------------------

function validateOpenRPC(doc: OpenRPCDocument, filename: string): void {
  if (!doc.openrpc) {
    throw new Error(`${filename}: missing "openrpc" field`);
  }
  if (!doc.info?.title) {
    throw new Error(`${filename}: missing "info.title" field`);
  }
  if (!Array.isArray(doc.methods)) {
    throw new Error(`${filename}: "methods" must be an array`);
  }
  for (const method of doc.methods) {
    if (!method.name) {
      throw new Error(`${filename}: method missing "name" field`);
    }
    if (!Array.isArray(method.params)) {
      throw new Error(`${filename}: method "${method.name}" missing "params" array`);
    }
    if (!method.result) {
      throw new Error(`${filename}: method "${method.name}" missing "result"`);
    }
  }
}
