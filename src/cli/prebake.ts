/**
 * Pre-bake agent data to .archon-data.json
 * Run: npx tsx src/cli/prebake.ts <projectRoot>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../scanner/configLoader';
import { AgentRegistry } from '../scanner/registry';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const archonRoot = path.resolve(__dirname, '../..');
const projectRoot = process.argv[2] || process.cwd();

const config = await loadConfig(projectRoot);
const registry = new AgentRegistry(config, projectRoot);
await registry.scan();

const data = {
  agents: registry.getAllSerializable(),
  pipelines: registry.getPipelines(),
  bakedAt: new Date().toISOString(),
  projectRoot,
};

const outPath = path.resolve(archonRoot, '.archon-data.json');
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

console.log(`  ✓ Baked ${data.agents.length} agents + ${data.pipelines.length} pipelines → .archon-data.json`);
