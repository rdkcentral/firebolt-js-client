const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "pub");
const files = [
  ["references/ghpages-index.html", "index.html"],
  ["references/firebolt-cert-app.html", "firebolt-cert-app.html"],
  ["src/certification/runner.js", "certification-runner.js"],
  ["generated/certification/api-test-manifest.json", "api-test-manifest.json"],
  ["generated/inject-js/firebolt-inject.js", "firebolt-inject.js"],
];

// Recursive directory copy function
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const [source] of files) {
  if (!fs.existsSync(path.join(root, source))) {
    throw new Error(`Missing required GitHub Pages input: ${source}`);
  }
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const [source, destination] of files) {
  fs.copyFileSync(path.join(root, source), path.join(outputDir, destination));
}

// Copy VitePress output if it exists
const vitepressDist = path.join(root, "docs/.vitepress/dist");
if (fs.existsSync(vitepressDist)) {
  copyRecursive(vitepressDist, path.join(outputDir, "api-docs"));
}