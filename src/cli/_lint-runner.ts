/**
 * Standalone lint runner — executed via `tsx` subprocess.
 * Scans agents and runs the best-practices analyzer on each.
 *
 * Usage: npx tsx src/cli/_lint-runner.ts <projectRoot> [--strict]
 */
import { loadConfig } from '../scanner/configLoader';
import { AgentRegistry } from '../scanner/registry';
import { analyzeAgent, calculateHealthScore } from '../lib/analyzer';

const projectRoot = process.argv[2] || process.cwd();
const strict = process.argv.includes('--strict');

// Scan agents
const config = await loadConfig(projectRoot);
const registry = new AgentRegistry(config, projectRoot);
await registry.scan();
const agents = registry.getAllSerializable();

if (agents.length === 0) {
  console.log('\n  \u26A0 No agents found. Run "archon init" to get started.\n');
  process.exit(0);
}

let totalCritical = 0;
let totalWarning = 0;
let totalInfo = 0;

console.log();
console.log(`  \u26A1 Archon Lint \u2014 ${agents.length} agent${agents.length === 1 ? '' : 's'}`);
console.log();

for (const agent of agents) {
  const recs = analyzeAgent(agent);
  const score = calculateHealthScore(recs);
  const critical = recs.filter(r => r.severity === 'critical').length;
  const warning = recs.filter(r => r.severity === 'warning').length;
  const info = recs.filter(r => r.severity === 'info').length;

  totalCritical += critical;
  totalWarning += warning;
  totalInfo += info;

  // Color the score
  const scoreColor = score >= 80 ? '\x1b[32m' : score >= 50 ? '\x1b[33m' : '\x1b[31m';
  const reset = '\x1b[0m';

  // Icon based on status
  const icon = critical > 0 ? '\u2717' : warning > 0 ? '\u26A0' : '\u2713';
  const iconColor = critical > 0 ? '\x1b[31m' : warning > 0 ? '\x1b[33m' : '\x1b[32m';

  console.log(`  ${iconColor}${icon}${reset} ${agent.name ?? agent.id} ${scoreColor}(${score}/100)${reset}`);

  // Show critical and warning details
  for (const rec of recs.filter(r => r.severity === 'critical')) {
    console.log(`    \x1b[31m\u2717 ${rec.title}\x1b[0m \u2014 ${rec.description}`);
    if (rec.fix) console.log(`      \uD83D\uDCA1 ${rec.fix}`);
  }
  for (const rec of recs.filter(r => r.severity === 'warning')) {
    console.log(`    \x1b[33m\u26A0 ${rec.title}\x1b[0m \u2014 ${rec.description}`);
  }
}

console.log();
console.log(`  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
console.log(`  ${totalCritical > 0 ? '\x1b[31m' : '\x1b[32m'}${agents.length} agents | ${totalCritical} critical | ${totalWarning} warnings | ${totalInfo} info\x1b[0m`);
console.log();

// Exit code
if (totalCritical > 0) {
  console.log(`  \x1b[31m\u2717 Lint failed \u2014 ${totalCritical} critical issue${totalCritical === 1 ? '' : 's'} found\x1b[0m`);
  console.log();
  process.exit(1);
}

if (strict && totalWarning > 0) {
  console.log(`  \x1b[33m\u2717 Lint failed (strict mode) \u2014 ${totalWarning} warning${totalWarning === 1 ? '' : 's'} found\x1b[0m`);
  console.log();
  process.exit(1);
}

console.log(`  \x1b[32m\u2713 Lint passed\x1b[0m`);
console.log();
