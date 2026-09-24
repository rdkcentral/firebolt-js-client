/**
 * Spec Reader Utility
 *
 * Reads spec.md files and extracts metadata for enhanced JSDoc generation.
 * This utility parses YAML frontmatter from spec files and provides
 * structured access to module and method documentation.
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

// ---------------------------------------------------------------------------
// Data Structures
// ---------------------------------------------------------------------------

export interface SpecExample {
  description: string;
  params?: Record<string, unknown>;
  result?: unknown;
}

export interface SpecParamData {
  name: string;
  description: string;
  type: string;
  required: boolean;
}

export interface SpecResultData {
  type: string;
  description?: string;
}

export interface SpecMethodData {
  name: string;
  description: string;
  since?: string;
  platform?: string;
  examples?: SpecExample[];
  params?: SpecParamData[];
  result?: SpecResultData;
}

export interface SpecModuleData {
  description: string;
  version: string;
  platform: string;
  stability: string;
  actions: SpecMethodData[];
  properties: SpecMethodData[];
  events: SpecMethodData[];
}

// ---------------------------------------------------------------------------
// Spec File Reading
// ---------------------------------------------------------------------------

/**
 * Read and parse a spec.md file for a given module.
 * @param moduleName - The name of the module (e.g., "Localization")
 * @returns Parsed spec module data, or null if file doesn't exist
 */
export function readSpecFile(moduleName: string): SpecModuleData | null {
  const specPath = path.join(process.cwd(), "openspec", "specs", moduleName.toLowerCase(), "spec.md");

  if (!fs.existsSync(specPath)) {
    console.warn(`Spec file not found for module: ${moduleName} at ${specPath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(specPath, "utf-8");
    return parseSpecContent(content);
  } catch (error) {
    throw new Error(
      `Failed to parse spec file for module ${moduleName} at ${specPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Parse the content of a spec.md file.
 * @param content - The file content
 * @returns Parsed spec module data
 */
function parseSpecContent(content: string): SpecModuleData {
  // Extract YAML frontmatter (between --- markers)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error("No YAML frontmatter found in spec file");
  }

  const yamlContent = frontmatterMatch[1];
  let parsed: any;

  try {
    parsed = yaml.load(yamlContent);
  } catch (error) {
    throw new Error(`Invalid YAML in spec file: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Validate required fields
  if (!parsed.module) {
    throw new Error("Missing required field: module");
  }
  if (!parsed.version) {
    throw new Error("Missing required field: version");
  }
  if (!parsed.platform) {
    throw new Error("Missing required field: platform");
  }
  if (!parsed.stability) {
    throw new Error("Missing required field: stability");
  }

  return {
    description: parsed.description || "",
    version: parsed.version,
    platform: parsed.platform,
    stability: parsed.stability,
    actions: parsed.actions || [],
    properties: parsed.properties || [],
    events: parsed.events || [],
  };
}

// ---------------------------------------------------------------------------
// Method Lookup
// ---------------------------------------------------------------------------

/**
 * Find method spec data by name and kind.
 * @param moduleData - The module spec data
 * @param methodName - The method name to search for
 * @param methodKind - The kind of method ("call" for actions/properties, "subscribe" for events)
 * @returns Method spec data, or undefined if not found
 */
export function findMethodSpec(
  moduleData: SpecModuleData,
  methodName: string,
  methodKind: "call" | "subscribe"
): SpecMethodData | undefined {
  if (methodKind === "call") {
    // Search in actions and properties
    const action = moduleData.actions.find((m) => m.name === methodName);
    if (action) return action;

    const property = moduleData.properties.find((m) => m.name === methodName);
    if (property) return property;
  } else {
    // Search in events
    const event = moduleData.events.find((m) => m.name === methodName);
    if (event) return event;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Batch Loading
// ---------------------------------------------------------------------------

/**
 * Load all spec files at once and cache in memory.
 * @returns Map of module name to spec data
 */
export function loadAllSpecs(): Map<string, SpecModuleData> {
  const specsDir = path.join(process.cwd(), "openspec", "specs");
  const specMap = new Map<string, SpecModuleData>();

  if (!fs.existsSync(specsDir)) {
    console.warn(`Specs directory not found: ${specsDir}`);
    return specMap;
  }

  const moduleDirs = fs.readdirSync(specsDir, { withFileTypes: true });

  for (const dir of moduleDirs) {
    if (!dir.isDirectory()) continue;

    // Skip _meta directory
    if (dir.name === "_meta") continue;

    const specPath = path.join(specsDir, dir.name, "spec.md");
    if (!fs.existsSync(specPath)) continue;

    try {
      const moduleName = dir.name.charAt(0).toUpperCase() + dir.name.slice(1); // Convert to PascalCase
      const specData = readSpecFile(moduleName);
      if (specData) {
        specMap.set(moduleName, specData);
      }
    } catch (error) {
      console.warn(`Failed to load spec for module ${dir.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return specMap;
}
