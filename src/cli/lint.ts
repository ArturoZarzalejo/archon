import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function lint(projectRoot: string, options: { strict?: boolean } = {}) {
  const archonRoot = path.resolve(__dirname, '../..');
  const runner = path.resolve(archonRoot, 'src/cli/_lint-runner.ts');
  const args = ['tsx', runner, projectRoot];
  if (options.strict) args.push('--strict');

  try {
    execFileSync('npx', args, {
      cwd: archonRoot,
      stdio: 'inherit',
      env: { ...process.env, ARCHON_PROJECT_ROOT: projectRoot },
    });
  } catch (err: any) {
    process.exit(err.status ?? 1);
  }
}
