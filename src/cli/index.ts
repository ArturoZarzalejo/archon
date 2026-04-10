import { dev } from './dev';
import { init } from './init';
import { build } from './build';
import { lint } from './lint';

const args = process.argv.slice(2);
const command = args[0];

// Parse --port flag
function parsePort(): number | undefined {
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    const parsed = parseInt(args[portIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 65536) return parsed;
    console.error('  ✗ Invalid port number. Using default 6006.');
  }
  return undefined;
}

switch (command) {
  case 'dev':
    dev(process.cwd(), parsePort());
    break;
  case 'init':
    init(process.cwd()).catch(console.error);
    break;
  case 'build':
    build(process.cwd());
    break;
  case 'lint':
    lint(process.cwd(), { strict: args.includes('--strict') });
    break;
  default:
    console.log(`
  archon — The Storybook for AI Agents

  Usage:
    archon dev          Start agent viewer (Next.js on :6006)
    archon init         Scaffold config + example agent
    archon build        Build static agent catalog
    archon lint         Lint agents — fail on critical issues
    archon lint --strict  Fail on warnings too (CI mode)

  Options:
    --port <number>     Override dev server port
    --strict            (lint) Treat warnings as errors
    --help              Show this help
`);
}
