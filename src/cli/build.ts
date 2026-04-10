import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function build(projectRoot: string) {
  const archonRoot = path.resolve(__dirname, '../..');
  const outputDir = path.resolve(projectRoot, 'archon-dist');
  const dotNext = path.resolve(archonRoot, '.next');
  const standalone = path.resolve(dotNext, 'standalone');

  console.log();
  console.log('  ⚡ Archon — Building deployable agent viewer...');
  console.log(`  ➜ Scanning: ${projectRoot}`);
  console.log();

  // 1. Pre-scan agents and bake data into .archon-data.json
  const prebakeScript = path.resolve(archonRoot, 'src/cli/prebake.ts');
  console.log('  ➜ Pre-scanning agents...');
  try {
    execSync(`npx tsx "${prebakeScript}" "${projectRoot}"`, {
      cwd: archonRoot,
      stdio: 'inherit',
      env: { ...process.env, ARCHON_PROJECT_ROOT: projectRoot },
    });
  } catch {
    console.warn('  ⚠ Pre-scan failed — build will use mock data if available');
  }

  // 2. Build Next.js with standalone output
  execSync('npx next build', {
    cwd: archonRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ARCHON_PROJECT_ROOT: projectRoot,
    },
  });

  if (!existsSync(standalone)) {
    console.error('  ✗ Standalone output not found.');
    process.exit(1);
  }

  // 2. Clean previous output
  if (existsSync(outputDir)) {
    execSync(`rm -rf "${outputDir}"`);
  }
  mkdirSync(outputDir, { recursive: true });

  // 3. Find the server directory inside standalone
  //    Standalone mirrors the monorepo: .next/standalone/packages/archon/
  //    Or for non-monorepo: .next/standalone/
  const monorepoServerDir = path.resolve(standalone, 'packages/archon');
  const directServerDir = standalone;
  const serverDir = existsSync(path.resolve(monorepoServerDir, 'server.js'))
    ? monorepoServerDir
    : existsSync(path.resolve(directServerDir, 'server.js'))
      ? directServerDir
      : null;

  if (!serverDir) {
    console.error('  ✗ server.js not found in standalone output.');
    process.exit(1);
  }

  // 4. Copy the server directory as the root of archon-dist
  cpSync(serverDir, outputDir, { recursive: true });

  // 5. Copy .next/static → archon-dist/.next/static
  const staticSrc = path.resolve(dotNext, 'static');
  const staticDest = path.resolve(outputDir, '.next/static');
  if (existsSync(staticSrc)) {
    mkdirSync(path.dirname(staticDest), { recursive: true });
    cpSync(staticSrc, staticDest, { recursive: true });
  }

  // 6. Copy baked agent data
  const bakedSrc = path.resolve(archonRoot, '.archon-data.json');
  if (existsSync(bakedSrc)) {
    cpSync(bakedSrc, path.resolve(outputDir, '.archon-data.json'));
    console.log('  ✓ Baked agent data copied to archon-dist/');
  }

  // 7. Copy standalone node_modules (for next runtime)
  const nmSrc = path.resolve(standalone, 'node_modules');
  const nmDest = path.resolve(outputDir, 'node_modules');
  if (existsSync(nmSrc) && !existsSync(nmDest)) {
    cpSync(nmSrc, nmDest, { recursive: true });
  }

  // 7. Create start script
  writeFileSync(
    path.resolve(outputDir, 'start.sh'),
    `#!/bin/sh
PORT=\${PORT:-6006}
HOSTNAME=\${HOSTNAME:-0.0.0.0}
export PORT HOSTNAME
echo ""
echo "  ⚡ Archon — Agent Viewer"
echo "  ➜ http://\${HOSTNAME}:\${PORT}"
echo ""
node server.js
`,
    { mode: 0o755 }
  );

  // 8. Create package.json
  writeFileSync(
    path.resolve(outputDir, 'package.json'),
    JSON.stringify({
      name: 'archon-viewer',
      type: 'module',
      private: true,
      scripts: {
        start: 'PORT=${PORT:-6006} HOSTNAME=0.0.0.0 node server.js',
      },
    }, null, 2)
  );

  console.log();
  console.log('  ✓ Build complete!');
  console.log();
  console.log('  Output: ./archon-dist/');
  console.log();
  console.log('  To run:');
  console.log('    cd archon-dist && sh start.sh');
  console.log();
  console.log('  Or with npm:');
  console.log('    cd archon-dist && npm start');
  console.log();
  console.log('  To deploy:');
  console.log('    Upload archon-dist/ to any Node.js host');
  console.log('    (Docker, Railway, Fly.io, VPS, etc.)');
  console.log();
}

