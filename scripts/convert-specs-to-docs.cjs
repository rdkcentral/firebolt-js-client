/**
 * Convert OpenSpec spec.md files to VitePress Markdown documentation
 *
 * This script reads Firebolt API spec files from openspec/specs/api/<module>/spec.md
 * and generates VitePress-compatible Markdown files in docs/api/<module>.md
 *
 * Spec format assumptions:
 * - YAML frontmatter with module metadata (module, version, platform, stability, description)
 * - Types array with name, description, and properties
 * - Properties array with name, description, result, and examples
 * - Actions array with name, description, params, and result
 * - Events array with name, description, params
 * - Description fields may contain multiline text
 * - Examples contain description and result fields
 *
 * Usage:
 *   node scripts/convert-specs-to-docs.cjs
 *
 * Output:
 *   docs/api/<module>.md for each module (excludes 'shared' module)
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '..');
const specsDir = path.join(root, 'openspec/specs/api');
const outputDir = path.join(root, 'docs/api');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read all spec.md files from the specs directory (include shared, exclude native-only modules)
const specFiles = fs.readdirSync(specsDir)
  .filter(dir => {
    const specPath = path.join(specsDir, dir, 'spec.md');
    if (!fs.existsSync(specPath)) return false;
    // Read and check platform field
    const content = fs.readFileSync(specPath, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = yaml.load(frontmatterMatch[1]);
      // Exclude native-only modules (only include web and both), but include shared
      if (dir === 'shared') return true;
      return frontmatter.platform !== 'native';
    }
    return true;
  })
  .map(dir => path.join(specsDir, dir, 'spec.md'))
  .filter(file => fs.existsSync(file));

console.log(`Found ${specFiles.length} spec files:`);
specFiles.forEach(file => console.log(`  - ${file}`));

// Process each spec file
specFiles.forEach(specFile => {
  const content = fs.readFileSync(specFile, 'utf8');

  // Split frontmatter and content
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    console.error(`No frontmatter found in ${specFile}`);
    return;
  }

  const frontmatterText = frontmatterMatch[1];
  const markdownContent = frontmatterMatch[2];

  // Parse YAML frontmatter
  let frontmatter;
  try {
    // Use default schema to parse quoted references correctly
    frontmatter = yaml.load(frontmatterText);
  } catch (e) {
    console.error(`Failed to parse YAML in ${specFile}:`, e.message);
    return;
  }

  const moduleName = frontmatter.module;
  if (!moduleName) {
    console.error(`No module name in ${specFile}`);
    return;
  }

  console.log(`Processing module: ${moduleName}`);

  // Generate VitePress frontmatter
  const description = frontmatter.description || '';
  // Sanitize description for YAML frontmatter: replace newlines, escape double quotes, replace em dashes, escape angle brackets, and truncate if too long
  const sanitizedDescription = description
    .replace(/\n/g, ' ')
    .replace(/"/g, '\\"')
    .replace(/[\u2014\u2013]/g, '--')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .substring(0, 500); // Truncate to avoid YAML parsing issues
  const vitepressFrontmatter = `---
title: "${moduleName}"
description: "${sanitizedDescription}"
---

`;

  // Generate module content
  let markdown = vitepressFrontmatter;
  // Use markdown syntax instead of HTML div to avoid Vue parsing issues
  markdown += `# ${moduleName}\n\n`;
  // Sanitize body description: replace em dashes with regular dashes
  let bodyDescription = sanitizeText(frontmatter.description || '');
  // For Shared module, provide a web-focused description
  if (moduleName === 'Shared') {
    bodyDescription = 'Common type definitions used across Firebolt Web modules. This page documents types that are referenced by multiple modules.';
  }
  markdown += `${bodyDescription}\n\n`;

  // Add version and platform info
  if (frontmatter.version) {
    markdown += `**Version:** ${frontmatter.version}\n\n`;
  }
  if (frontmatter.platform) {
    markdown += `**Platform:** ${frontmatter.platform}\n\n`;
  }
  if (frontmatter.stability) {
    markdown += `**Stability:** ${frontmatter.stability}\n\n`;
  }

  // Track what sections exist
  for (const section of ['properties', 'actions', 'events']) {
    frontmatter[section] = (frontmatter[section] || []).filter(item => item.platform !== 'native');
  }
  const hasProperties = frontmatter.properties.length > 0;
  const hasActions = frontmatter.actions.length > 0;
  const hasEvents = frontmatter.events.length > 0;
  const hasTypes = frontmatter.types && frontmatter.types.length > 0;

  // Helper function to sanitize text for Vue/VitePress
  function sanitizeText(text) {
    if (!text) return '';
    // Replace em dash (U+2014) and en dash (U+2013) with regular dashes, and escape angle brackets
    return text
      .replace(/[\u2014\u2013]/g, '--')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Helper function to format return type
  function formatReturnType(result) {
    if (!result) return 'void';
    if (typeof result === 'string') {
      // Handle "#/types/SomeType" format
      if (result.includes('#/types/')) {
        const match = result.match(/\/types\/(.+)$/);
        const typeName = match ? match[1] : result;
        // Create deeplink to type (with 'type-' prefix)
        return `[${typeName}](#type-${typeName.toLowerCase()})`;
      }
      // Handle "shared:SomeType" format - link to shared types page
      if (result.includes('shared:')) {
        const typeName = result.replace('shared:', '');
        return `[${typeName}](/api/shared#type-${typeName.toLowerCase()})`;
      }
      return result;
    }
    if (typeof result === 'object') {
      // Handle direct $ref (like Accessibility pattern): { $ref: "#/types/TypeName" }
      if (result.$ref) {
        const ref = result.$ref;
        if (typeof ref === 'string') {
          if (ref.includes('shared:')) {
            const typeName = ref.replace('shared:', '');
            return `[${typeName}](/api/shared#type-${typeName.toLowerCase()})`;
          }
          const match = ref.match(/\/types\/(.+)$/);
          const typeName = match ? match[1] : ref;
          // Create deeplink to type (with 'type-' prefix)
          return `[${typeName}](#type-${typeName.toLowerCase()})`;
        }
        // If it's a YAML reference, try to convert to string
        try {
          const refStr = String(ref);
          if (refStr.includes('shared:')) {
            const typeName = refStr.replace('shared:', '');
            return `[${typeName}](/api/shared#type-${typeName.toLowerCase()})`;
          }
          const match = refStr.match(/\/types\/(.+)$/);
          const typeName = match ? match[1] : refStr;
          return `[${typeName}](#type-${typeName.toLowerCase()})`;
        } catch {
          return 'object';
        }
      }
      if (result.type) {
        if (typeof result.type === 'string') {
          // Direct type string like "bool", "string", etc.
          const baseType = result.type;
          // Handle array with items at the top level
          if (result.items) {
            const itemsType = formatReturnType(result.items);
            return `${itemsType}[]`;
          }
          return baseType;
        }
        if (typeof result.type === 'object') {
          // Handle nested { $ref: "..." }
          if (result.type.$ref) {
            const ref = result.type.$ref;
            if (typeof ref === 'string') {
              if (ref.includes('shared:')) {
                const typeName = ref.replace('shared:', '');
                return `[${typeName}](/api/shared#type-${typeName.toLowerCase()})`;
              }
              const match = ref.match(/\/types\/(.+)$/);
              const typeName = match ? match[1] : ref;
              // Create deeplink to type (with 'type-' prefix)
              return `[${typeName}](#type-${typeName.toLowerCase()})`;
            }
            // Handle case where $ref is still an object due to YAML parsing
            if (ref && typeof ref === 'object' && ref.$ref) {
              const refStr = ref.$ref;
              if (refStr.includes('shared:')) {
                const typeName = refStr.replace('shared:', '');
                return `[${typeName}](/api/shared#type-${typeName.toLowerCase()})`;
              }
              const match = refStr.match(/\/types\/(.+)$/);
              const typeName = match ? match[1] : refStr;
              return `[${typeName}](#type-${typeName.toLowerCase()})`;
            }
          }
          // Handle nested { type: "bool", items: "string" } for arrays
          if (result.type.type) {
            const baseType = result.type.type;
            const items = result.type.items;
            if (items) {
              const itemsType = formatReturnType(items);
              return `${itemsType}[]`;
            }
            return baseType;
          }
        }
        return result.type;
      }
      // For complex objects, just return 'object' - the examples will show the structure
      return 'object';
    }
    return typeof result;
  }

  // Process Methods (combining properties, actions, and events)
  if (hasProperties || hasActions || hasEvents) {
    markdown += `## Methods\n\n`;

    // Process properties
    if (hasProperties) {
      frontmatter.properties.forEach(prop => {
        markdown += `### ${prop.name}\n\n`;
        // Replace newlines in description with spaces and sanitize special chars
        const cleanDescription = sanitizeText((prop.description || '').replace(/\n/g, ' '));
        markdown += `${cleanDescription}\n\n`;
        if (prop.result) {
          const returnType = formatReturnType(prop.result);
          // Fallback for any remaining [object Object]
          const displayType = returnType === '[object Object]' ? 'object' : returnType;
          // Don't wrap in backticks if it's a link (contains markdown link syntax)
          if (displayType.includes('[') && displayType.includes('](')) {
            markdown += `**Returns:** ${displayType}\n\n`;
          } else {
            markdown += `**Returns:** \`${displayType}\`\n\n`;
          }
        }
        // Generate JavaScript usage example
        markdown += `**Usage:**\n\n`;
        markdown += `\`\`\`javascript\nconst result = await firebolt.${moduleName}.${prop.name}();\n\`\`\`\n\n`;
        if (prop.examples && prop.examples.length > 0) {
          markdown += `**Example Response:**\n\n`;
          prop.examples.forEach(example => {
            markdown += `${example.description || ''}:\n\n`;
            if (example.result !== undefined) {
              markdown += `\`\`\`json\n${JSON.stringify(example.result, null, 2)}\n\`\`\`\n\n`;
            }
          });
        }
      });
    }

    // Process actions
    if (hasActions) {
      frontmatter.actions.forEach(action => {
        markdown += `### ${action.name}\n\n`;
        // Replace newlines in description with spaces and sanitize special chars
        const cleanDescription = sanitizeText((action.description || '').replace(/\n/g, ' '));
        markdown += `${cleanDescription}\n\n`;
        if (action.params && action.params.length > 0) {
          markdown += `**Parameters:**\n\n`;
          markdown += `| Parameter | Type | Description |\n`;
          markdown += `|-----------|------|-------------|\n`;
          action.params.forEach(param => {
            const paramType = formatReturnType(param.type);
            const displayType = paramType === '[object Object]' ? 'object' : paramType;
            // Replace newlines in description with spaces and sanitize special chars
            const cleanParamDescription = sanitizeText((param.description || '').replace(/\n/g, ' '));
            markdown += `| ${param.name} | ${displayType} | ${cleanParamDescription} |\n`;
          });
          markdown += `\n`;
        }
        if (action.result) {
          const returnType = formatReturnType(action.result, moduleName);
          const displayType = returnType === '[object Object]' ? 'object' : returnType;
          // Don't wrap in backticks if it's a link (contains markdown link syntax)
          if (displayType.includes('[') && displayType.includes('](')) {
            markdown += `**Returns:** ${displayType}\n\n`;
          } else {
            markdown += `**Returns:** \`${displayType}\`\n\n`;
          }
        }
        // Generate JavaScript usage example
        markdown += `**Usage:**\n\n`;
        if (action.params && action.params.length > 0) {
          // Example with parameters
          const paramNames = action.params.map(p => p.name).join(', ');
          const args = action.params.length > 1 ? `{ ${paramNames} }` : paramNames;
          markdown += `\`\`\`javascript\nconst result = await firebolt.${moduleName}.${action.name}(${args});\n\`\`\`\n\n`;
        } else {
          // Example without parameters
          markdown += `\`\`\`javascript\nconst result = await firebolt.${moduleName}.${action.name}();\n\`\`\`\n\n`;
        }
      });
    }

    // Process events (both explicit events and auto-generated property change events)
    if (hasEvents) {
      frontmatter.events.forEach(event => {
        markdown += `### ${event.name}\n\n`;
        // Replace newlines in description with spaces and sanitize special chars
        const cleanDescription = sanitizeText((event.description || '').replace(/\n/g, ' '));
        markdown += `${cleanDescription}\n\n`;
        // Always show data and cancelled parameters for events
        markdown += `**Parameters:**\n\n`;
        markdown += `| Parameter | Type | Description |\n`;
        markdown += `|-----------|------|-------------|\n`;
        // Add data parameter
        let dataType = 'void';
        if (event.result) {
          dataType = formatReturnType(event.result);
        } else if (event.payload) {
          dataType = formatReturnType(event.payload);
        }
        const displayDataType = dataType === '[object Object]' ? 'object' : dataType;
        markdown += `| data | ${displayDataType} | Event payload data |\n`;
        // Add cancelled parameter
        markdown += `| cancelled | bool | True if the listener was cancelled by the platform |\n`;
        markdown += `\n`;
        // Generate JavaScript usage example
        markdown += `**Usage:**\n\n`;
        markdown += `\`\`\`javascript\n// Subscribe to event\nfirebolt.${moduleName}.${event.name}((data, cancelled) => {\n  if (cancelled) {\n    console.log('Event listener was cancelled');\n    return;\n  }\n  console.log('Event received:', data);\n});\n\`\`\`\n\n`;
      });
    }

    // Auto-generate property change events (avoid duplicates with explicit events)
    if (hasProperties) {
      const explicitEventNames = (frontmatter.events || []).map(e => e.name);
      frontmatter.properties.forEach(prop => {
        const eventName = `on${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)}Changed`;
        // Skip if this event already exists explicitly in the spec
        if (!explicitEventNames.includes(eventName)) {
          markdown += `### ${eventName}\n\n`;
          // Replace newlines in property description with spaces and sanitize special chars
          const cleanPropDescription = sanitizeText((prop.description || '').replace(/\n/g, ' '));
          markdown += `Event for when ${moduleName}.${prop.name} changed. ${cleanPropDescription}\n\n`;
          // Always show data and cancelled parameters
          markdown += `**Parameters:**\n\n`;
          markdown += `| Parameter | Type | Description |\n`;
          markdown += `|-----------|------|-------------|\n`;
          // Add data parameter
          let dataType = 'void';
          if (prop.result) {
            dataType = formatReturnType(prop.result);
          }
          const displayDataType = dataType === '[object Object]' ? 'object' : dataType;
          markdown += `| data | ${displayDataType} | Event payload data |\n`;
          // Add cancelled parameter
          markdown += `| cancelled | bool | True if the listener was cancelled by the platform |\n`;
          markdown += `\n`;
          // Generate JavaScript usage example
          markdown += `**Usage:**\n\n`;
          markdown += `\`\`\`javascript\n// Subscribe to event\nfirebolt.${moduleName}.${eventName}((data, cancelled) => {\n  if (cancelled) {\n    console.log('Event listener was cancelled');\n    return;\n  }\n  console.log('Event received:', data);\n});\n\`\`\`\n\n`;
        }
      });
    }
  }

  // Process types
  if (frontmatter.types && frontmatter.types.length > 0) {
    markdown += `## Types\n\n`;
    // Filter types: for shared module, only include types that are publicly referenced (e.g., AgePolicy)
    // Exclude internal transport types like ListenResponse and FireboltError
    const typesToInclude = frontmatter.types.filter(type => {
      if (moduleName === 'Shared') {
        // Only include AgePolicy for web documentation
        return type.name === 'AgePolicy';
      }
      return true;
    });

    typesToInclude.forEach(type => {
      // Add anchor for deeplinking (prefix with 'type-' to avoid conflicts)
      markdown += `### ${type.name} {#type-${type.name.toLowerCase()}}\n\n`;
      // Replace newlines in type description with spaces and sanitize special chars
      const cleanTypeDescription = sanitizeText((type.description || '').replace(/\n/g, ' '));
      markdown += `${cleanTypeDescription}\n\n`;
      if (type.kind === 'enum' && type.values && type.values.length > 0) {
        markdown += `**Possible values:**\n\n`;
        type.values.forEach(value => {
          const valueStr = typeof value.id === 'string' ? `"${value.id}"` : value.id;
          // Replace newlines in description with spaces and sanitize special chars
          const cleanValueDescription = sanitizeText((value.description || '').replace(/\n/g, ' '));
          markdown += `- \`${valueStr}\` - ${cleanValueDescription}\n`;
        });
        markdown += `\n`;
      }
      if (type.properties && type.properties.length > 0) {
        markdown += `| Property | Type | Description |\n`;
        markdown += `|----------|------|-------------|\n`;
        type.properties.forEach(prop => {
          const propType = formatReturnType(prop.type);
          const displayType = propType === '[object Object]' ? 'object' : propType;
          // Replace newlines in description with spaces and sanitize special chars
          const cleanDescription = sanitizeText((prop.description || '').replace(/\n/g, ' '));
          markdown += `| ${prop.name} | ${displayType} | ${cleanDescription} |\n`;
        });
        markdown += `\n`;
      }
    });
  }

  // Write output file (convert PascalCase to kebab-case for filename)
  const fileName = moduleName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
  const outputFile = path.join(outputDir, `${fileName}.md`);
  // Replace any remaining [object Object] with 'object'
  let cleanMarkdown = markdown.replace(/\[object Object\]/g, 'object');
  // Convert type names in backticks to deeplinks (e.g., `ClosedCaptionsSettings` -> `[ClosedCaptionsSettings](#type-closedcaptionssettings)`)
  cleanMarkdown = cleanMarkdown.replace(/`([A-Z][a-zA-Z0-9]+)`/g, (match, typeName) => {
    // Don't convert simple types
    if (['bool', 'string', 'number', 'array', 'object', 'void', 'unsigned'].includes(typeName)) {
      return match;
    }
    return `[${typeName}](#type-${typeName.toLowerCase()})`;
  });
  fs.writeFileSync(outputFile, cleanMarkdown);
  console.log(`  Generated: ${outputFile}`);
});

console.log(`\nConversion complete. Generated ${specFiles.length} documentation files.`);
