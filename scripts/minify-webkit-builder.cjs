const fs = require("node:fs/promises");
const path = require("node:path");
const { minify } = require("terser");

async function minifyBuilder(source) {
  const result = await minify(source, {
    ecma: 2015,
    compress: { ecma: 2015, expression: true },
    mangle: true,
    format: { comments: false, ecma: 2015 },
  });

  if (!result.code) {
    throw new Error("Terser produced an empty WebKit builder");
  }

  return `${result.code}\n`;
}

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const sourcePath = path.join(rootDir, "generated/inject-js/firebolt-webkit-builder.js");
  const outputPath = path.join(rootDir, "webkitExtension/resources/firebolt-builder.js");
  const source = await fs.readFile(sourcePath, "utf8");
  const output = await minifyBuilder(source);
  await fs.writeFile(outputPath, output, "utf8");
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  });
}

module.exports = { minifyBuilder };