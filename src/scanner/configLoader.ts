import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { ArchonConfig } from '@/schema/config';
import { ArchonConfigSchema } from '@/schema/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOADER_PATH = path.resolve(__dirname, '_loader.ts');

const CONFIG_FILENAMES = [
  'archon.config.ts',
  'archon.config.js',
  'archon.config.mjs',
];

export async function loadConfig(rootDir: string): Promise<ArchonConfig> {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.resolve(rootDir, filename);
    if (fs.existsSync(configPath)) {
      try {
        const result = execFileSync('npx', ['tsx', LOADER_PATH, configPath], {
          encoding: 'utf-8',
          cwd: rootDir,
          timeout: 15000,
        });
        const raw = JSON.parse(result.trim());
        return ArchonConfigSchema.parse(raw);
      } catch (err) {
        console.warn(`[archon] Failed to load config from ${filename}:`);
        console.warn(`  ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  return ArchonConfigSchema.parse({});
}
