#!/usr/bin/env node
/**
 * Bundle the collector into a single standalone JavaScript file.
 *
 * Usage: node scripts/bundle.mjs
 * Output: dist/collector-standalone.js
 */

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read package.json for version
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));

async function bundle() {
  console.log(`Bundling collector v${pkg.version}...`);

  const outPath = join(rootDir, 'dist/collector-standalone.cjs');

  const result = await esbuild.build({
    entryPoints: [join(rootDir, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile: outPath,
    minify: true,
    sourcemap: false,
    // Include all dependencies in the bundle
    packages: 'bundle',
    // Define version constant
    define: {
      'process.env.COLLECTOR_VERSION': JSON.stringify(pkg.version),
    },
  });

  if (result.errors.length > 0) {
    console.error('Build failed:', result.errors);
    process.exit(1);
  }

  // Prepend shebang and version comment (remove any existing shebang first)
  let bundledCode = readFileSync(outPath, 'utf-8');
  // Remove any existing shebang lines (esbuild copies from source)
  bundledCode = bundledCode.replace(/^#!.*\n/gm, '');
  const header = `#!/usr/bin/env node
// @claude-archive/collector v${pkg.version}
// Standalone bundle - no npm install required
// Usage: node collector-standalone.cjs sync [options]
`;
  writeFileSync(outPath, header + bundledCode);

  console.log(`Bundle created: dist/collector-standalone.cjs`);

  // Show file size
  const stats = readFileSync(outPath);
  const sizeKb = (stats.length / 1024).toFixed(1);
  console.log(`Size: ${sizeKb} KB`);
}

bundle().catch((err) => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
