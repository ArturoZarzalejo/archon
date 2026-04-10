import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { AgentDefinition } from '@/schema/agent';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOADER_PATH = path.resolve(__dirname, '_loader.ts');

export async function scanAgentFiles(
  rootDir: string,
  patterns: string[],
): Promise<AgentDefinition[]> {
  try {
    const result = execFileSync(
      'npx',
      ['tsx', LOADER_PATH, '--scan', rootDir, ...patterns],
      {
        encoding: 'utf-8',
        cwd: rootDir,
        timeout: 30000,
      },
    );

    // Parse only the last line (stdout JSON), ignore stderr
    const lines = result.trim().split('\n');
    const jsonLine = lines[lines.length - 1];
    return JSON.parse(jsonLine) as AgentDefinition[];
  } catch (err) {
    console.warn('[archon] Agent scan failed:');
    console.warn(`  ${err instanceof Error ? err.message : err}`);
    return [];
  }
}
