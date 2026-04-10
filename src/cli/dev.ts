import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function dev(projectRoot: string, port?: number) {
  const archonRoot = path.resolve(__dirname, '../..');
  const resolvedPort = port ?? 6006;

  console.log();
  console.log('  ⚡ Archon — Starting agent viewer...');
  console.log(`  ➜ Scanning: ${projectRoot}`);
  console.log(`  ➜ Port:     ${resolvedPort}`);
  console.log();

  execSync(`npx next dev --port ${resolvedPort} --turbopack`, {
    cwd: archonRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ARCHON_PROJECT_ROOT: projectRoot,
    },
  });
}
