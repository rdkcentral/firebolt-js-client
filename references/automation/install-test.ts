/**
 * Automated installation test for @firebolt-js/types package.
 * 
 * This test verifies that the package can be installed as a dev dependency
 * and that the types are available after installation.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const REFERENCE_APP_PATH = path.join(__dirname, "../firebolt-type-reference-app");

console.log("Starting automated installation test for @firebolt-js/types...");

try {
  // Test 1: Install the package as dev dependency
  console.log("Test 1: Installing @firebolt-js/types as dev dependency...");
  execSync(`cd ${REFERENCE_APP_PATH} && npm install`, { stdio: "inherit" });
  console.log("✓ Package installed successfully");

  // Test 2: Verify the package is in devDependencies
  console.log("Test 2: Verifying package is in devDependencies...");
  const packageJsonPath = path.join(REFERENCE_APP_PATH, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  
  if (!packageJson.devDependencies || !packageJson.devDependencies["@firebolt-js/types"]) {
    throw new Error("Package not found in devDependencies");
  }
  console.log("✓ Package found in devDependencies");

  // Test 3: Verify the types file is available
  console.log("Test 3: Verifying types file is available...");
  const typesPath = path.join(
    REFERENCE_APP_PATH,
    "node_modules/@firebolt-js/types/firebolt-inject.d.ts"
  );
  
  if (!fs.existsSync(typesPath)) {
    throw new Error("Types file not found in node_modules");
  }
  
  const typesContent = fs.readFileSync(typesPath, "utf8");
  if (!typesContent.includes("interface FireboltTransport")) {
    throw new Error("Types file does not contain expected interfaces");
  }
  console.log("✓ Types file is available and contains expected content");

  // Test 4: Build the reference app to verify types work
  console.log("Test 4: Building reference app to verify types work...");
  execSync(`cd ${REFERENCE_APP_PATH} && npm run build`, { stdio: "inherit" });
  console.log("✓ Reference app built successfully");

  console.log("\n✅ All installation tests passed!");
  console.log("The @firebolt-js/types package is correctly installed as a dev dependency.");
  console.log("Types are available and the reference app builds successfully.");

} catch (error) {
  console.error("\n❌ Installation test failed:", error);
  process.exit(1);
}