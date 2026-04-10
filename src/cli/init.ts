import fs from 'node:fs';
import path from 'node:path';
import {
  detectFrameworkAgents,
  summarizeDetections,
  frameworkLabel,
} from '@/scanner/frameworkDetector';

// ============================================================================
// Templates
// ============================================================================

const CONFIG_TEMPLATE = `import { defineConfig } from 'archon/schema';

export default defineConfig({
  // ── File scanning ─────────────────────────────────────────────────────
  // Glob patterns for agent definition files.
  // Each matched file should export a \`defineAgent()\` call as default.
  include: [
    'src/agents/**/*.agent.ts',
    'agents/**/*.agent.ts',
  ],

  // ── Markdown agents ───────────────────────────────────────────────────
  // Optional: scan markdown files that describe agents using front-matter.
  markdown: {
    enabled: false,
    paths: ['.agents/**/*.md'],
  },

  // ── Pipelines ─────────────────────────────────────────────────────────
  // Define multi-agent pipelines here, or in separate files.
  // See docs/schema-guide.md for the pipeline schema.
  pipelines: [],

  // ── UI ────────────────────────────────────────────────────────────────
  ui: {
    title: 'Archon',      // Browser tab & sidebar title
    port: 6006,            // Dev server port
    immersive: false,       // Full-bleed layout (no sidebar)
  },

  // ── Telemetry ─────────────────────────────────────────────────────────
  // Anonymous usage stats to help improve Archon. Fully opt-in.
  telemetry: {
    enabled: false,
    anonymous: true,
  },
});
`;

const EXAMPLE_AGENT_TEMPLATE = `import { defineAgent } from 'archon/schema';

/**
 * Example agent definition.
 *
 * This file demonstrates the most common fields you will use when
 * documenting an AI agent with Archon.  Replace the placeholder values
 * with your agent's real configuration.
 */
export default defineAgent({
  // ── Identity ──────────────────────────────────────────────────────────
  id: 'example-assistant',
  name: 'Example Assistant',
  description: 'A starter agent that shows how to use defineAgent().',
  version: '1.0.0',

  // ── Model ─────────────────────────────────────────────────────────────
  // The model identifier used at runtime (e.g. 'gpt-4o', 'claude-sonnet-4-20250514').
  model: 'gpt-4o',
  provider: 'openai',

  // ── Config ────────────────────────────────────────────────────────────
  config: {
    temperature: 0.7,
    maxTokens: 4096,
    streaming: true,
    maxRetries: 2,
    retryBackoff: 'exponential',
  },

  // ── I/O ───────────────────────────────────────────────────────────────
  input: {
    description: 'A user question or task in plain text.',
    example: 'Summarize the Q3 earnings report.',
  },
  output: {
    description: 'A structured response with the answer.',
    example: { answer: '...', confidence: 0.95 },
  },

  // ── Prompt ────────────────────────────────────────────────────────────
  // Replace with your agent's actual prompt
  prompt: \`<role>
You are a helpful assistant specialized in ...
</role>

<task>
Given the user's request, provide a clear and concise answer.
Include sources when possible.
</task>\`,

  // ── Graph relationships ───────────────────────────────────────────────
  // Agents that must run before this one
  dependsOn: [],
  // Agents that consume this agent's output
  feeds: [],

  // ── Metadata ──────────────────────────────────────────────────────────
  tags: ['example', 'starter'],
  status: 'experimental',
  author: 'Your Name',
});
`;

// ============================================================================
// Init command
// ============================================================================

export async function init(projectRoot: string) {
  console.log('\n  ⚡ Archon — Initializing...\n');

  // 1. Create archon.config.ts
  const configPath = path.resolve(projectRoot, 'archon.config.ts');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, CONFIG_TEMPLATE);
    console.log('  ✓ Created archon.config.ts');
  } else {
    console.log('  ⊘ archon.config.ts already exists');
  }

  // 2. Create agents directory
  const agentsDir = path.resolve(projectRoot, 'src/agents');
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
    console.log('  ✓ Created src/agents/');
  } else {
    console.log('  ⊘ src/agents/ already exists');
  }

  // 3. Create example agent
  const examplePath = path.resolve(agentsDir, 'example.agent.ts');
  if (!fs.existsSync(examplePath)) {
    fs.writeFileSync(examplePath, EXAMPLE_AGENT_TEMPLATE);
    console.log('  ✓ Created src/agents/example.agent.ts');
  } else {
    console.log('  ⊘ src/agents/example.agent.ts already exists');
  }

  // 4. Auto-detect agents from popular frameworks
  try {
    const detected = await detectFrameworkAgents(projectRoot);
    if (detected.length > 0) {
      const summary = summarizeDetections(detected, projectRoot);
      console.log('\n  Auto-detected agents:');
      for (const [dir, frameworks] of Object.entries(summary.byDirectory)) {
        for (const [fw, count] of Object.entries(frameworks)) {
          console.log(
            `    • ${count} ${frameworkLabel(fw as Parameters<typeof frameworkLabel>[0])} agent${count > 1 ? 's' : ''} found in ${dir}`,
          );
        }
      }
    }
  } catch {
    // Non-fatal — auto-detection is best-effort
  }

  // 5. Print next steps
  console.log('\n  Next steps:');
  console.log('    1. Edit archon.config.ts to configure scanning');
  console.log('    2. Define agents in src/agents/*.agent.ts');
  console.log('    3. Run: npx archon dev\n');
}
