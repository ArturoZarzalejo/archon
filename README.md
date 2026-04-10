<p align="center">
  <img src="public/logo-light.svg" alt="Archon" width="80" height="80" />
</p>

<h1 align="center">Archon</h1>

<p align="center">
  <strong>The Storybook for AI Agents</strong> — discover, visualize, lint, and test your agents.
</p>

## What is Archon?

Storybook revolutionized frontend development by giving teams a living catalog of their UI components. **Archon does the same thing for AI agents.** Drop a `*.agent.ts` file next to your code, call `defineAgent()`, and Archon automatically discovers it, renders it in a browsable catalog, and graphs its relationships with other agents.

Archon follows a **schema-first approach**: every agent is described with a typed `AgentDefinition` object that captures identity, model configuration, I/O schemas, prompts, guardrails, tools, handoffs, error handling, evaluations, runtime requirements, SLA targets, and live metrics. The schema is validated at definition time with Zod, so misconfigurations surface immediately rather than at runtime.

Archon is **framework-agnostic**. It does not import or execute your agent code -- it only reads the declarative definition you export. Whether you use the OpenAI SDK, Anthropic SDK, LangGraph, CrewAI, or a custom framework, Archon works the same way. It also includes a **Markdown Scanner** that can auto-discover agents from documentation files, making it easy to onboard legacy agents that predate the `defineAgent()` convention.

## Quick Start

```bash
# 1. Install
npm install archon

# 2. Create archon.config.ts in your project root
cat <<'EOF' > archon.config.ts
import { defineConfig } from 'archon';

export default defineConfig({
  include: ['src/**/*.agent.ts'],
  ui: {
    title: 'My Agents',
    port: 6006,
  },
});
EOF

# 3. Create your first agent
cat <<'EOF' > src/my-first.agent.ts
import { defineAgent } from 'archon';

export default defineAgent({
  id: 'my-first-agent',
  name: 'My First Agent',
  description: 'A simple agent to verify Archon is working.',
  model: 'gpt-4o',
  provider: 'openai',
  input: {
    description: 'A user question',
    example: { question: 'What is the capital of France?' },
  },
  output: {
    description: 'The agent response',
    example: { answer: 'Paris' },
  },
  tags: ['demo'],
});
EOF

# 4. Start the viewer
npx archon dev
```

Open [http://localhost:6006](http://localhost:6006) and you will see your agent in the catalog.

## Features

### Agent Catalog

Browse every agent in your project as a card grid. Each card shows the agent name, description, model, provider, version, status, and tags. Click a card to open the full detail view.

### Pipeline Graph

Visualize agent dependencies as a directed acyclic graph (DAG) powered by React Flow. Agents are positioned in topological layers based on their `dependsOn` relationships, so you can see the data flow from source agents to downstream consumers at a glance.

### Agent Detail

Inspect a single agent in depth: its full `defineAgent()` configuration, system prompt, input/output schemas with example payloads, tools, guardrails, handoffs, error definitions, evaluations, runtime requirements, SLA targets, and live metrics.

### Immersive 3D View

Explore your agents in a Three.js-powered 3D environment with animated avatars, spatial panels, and bloom post-processing. Each agent is rendered as a procedurally generated robot avatar that you can orbit around.

### Markdown Scanner

Already have agents documented in Markdown files? Archon's Markdown Scanner parses `.agents/**/*.md` files, extracts agent metadata (name, description, model, prompts, I/O types, dependencies), and registers them as `legacy` agents in the catalog. This bridges the gap between documentation-driven and schema-driven agent definitions.

### Mock Mode

Develop the Archon UI with realistic mock data by running `pnpm dev:mock` (sets `ARCHON_MOCK=true`). The mock registry includes 10+ agents across multiple modules and 2 pipelines, so you can work on the UI without needing real `*.agent.ts` files.

### Best Practices

Get automated recommendations to improve your agents based on their definitions -- missing guardrails, undeclared errors, absent metrics, and more.

## `defineAgent()` API

The core API is a single function that takes an `AgentDefinition` object and validates it with Zod at definition time.

```typescript
import { defineAgent } from 'archon';
import { z } from 'zod';

export default defineAgent({
  // -- Identity --
  id: 'hook-detection',
  name: 'Hook Detection',
  description: 'Detects high-retention viral hooks in transcripts.',
  version: '2.0.0',
  module: 'episodes',

  // -- Model --
  model: 'gpt-5.2',
  provider: 'openai',
  config: {
    temperature: 0.3,
    maxTokens: 3000,
    reasoning: { effort: 'low' },
    maxRetries: 3,
    retryBackoff: 'exponential',
    retryableErrors: ['RATE_LIMIT', 'TIMEOUT'],
    streaming: false,
    caching: true,
    cacheTtl: 3600,
    rateLimit: 100,
  },

  // -- I/O --
  input: {
    description: 'Parsed transcript with timestamps',
    schema: z.object({
      textWithTimestamps: z.string(),
      duration: z.number(),
    }),
    example: {
      textWithTimestamps: '[0:00] Welcome to the podcast...',
      duration: 3600,
    },
  },
  output: {
    description: 'Array of detected hooks with viral scores',
    schema: z.object({
      hooks: z.array(z.object({
        timestamp: z.string(),
        quote: z.string(),
        hook_type: z.enum(['revelation', 'controversy', 'question', 'bold_claim', 'emotional']),
        strength: z.number().min(1).max(10),
      })),
    }),
    example: {
      hooks: [{
        timestamp: '2:30',
        quote: 'What nobody knows is...',
        hook_type: 'revelation',
        strength: 9,
      }],
    },
  },

  // -- Prompt --
  prompt: `<role>
You are a VIRAL CONTENT ANALYST specialized in YouTube retention.
</role>

<task>
Extract the strongest hooks from the transcript.
</task>`,

  // -- Graph --
  dependsOn: ['transcript-parsing'],
  feeds: ['gpt-analysis'],
  tools: [
    'web-search',
    {
      name: 'sentiment-analysis',
      description: 'Analyze emotional tone of a text segment',
      inputSchema: { text: 'string' },
      outputSchema: { sentiment: 'string', score: 'number' },
    },
  ],
  handoffs: [
    {
      targetAgentId: 'manual-review',
      condition: 'When confidence < 0.5',
      transferData: true,
    },
  ],

  // -- Guardrails --
  guardrails: [
    {
      name: 'input-length-check',
      type: 'input',
      description: 'Reject transcripts shorter than 100 words',
      failAction: 'block',
    },
    {
      name: 'pii-filter',
      type: 'output',
      description: 'Strip personally identifiable information from output',
      failAction: 'warn',
    },
  ],

  // -- Errors --
  errors: [
    {
      code: 'TRANSCRIPT_TOO_SHORT',
      description: 'Input transcript has fewer than 100 words',
      recoverable: false,
    },
    {
      code: 'RATE_LIMIT',
      description: 'Provider rate limit exceeded',
      recoverable: true,
      retryStrategy: 'exponential',
    },
  ],

  // -- Hooks --
  hooks: [
    { event: 'beforeRun', description: 'Validate input format' },
    { event: 'afterRun', description: 'Log to telemetry' },
    { event: 'onError', description: 'Send alert to Slack' },
    { event: 'onRetry', description: 'Increment retry counter' },
  ],

  // -- Evaluations --
  evaluations: [
    {
      dataset: 'hook-detection-v2',
      date: '2026-03-15',
      scores: { precision: 0.92, recall: 0.87, f1: 0.89 },
      notes: 'Tested against 500 human-labeled podcast segments',
    },
  ],

  // -- Runtime --
  runtime: {
    memory: '512Mi',
    gpu: false,
    timeout: 30000,
    concurrency: 10,
  },

  // -- SLA --
  sla: {
    targetUptime: 0.999,
    maxLatencyMs: 5000,
    maxCostPerCall: 0.05,
  },

  // -- Secrets & Capabilities --
  secrets: ['OPENAI_API_KEY'],
  capabilities: ['text-analysis', 'content-scoring'],

  // -- Metadata --
  tags: ['viral', 'hooks', 'retention', 'youtube'],
  author: 'vision-team',
  status: 'active',
  metrics: {
    avgTokensIn: 8000,
    avgTokensOut: 1200,
    avgLatencyMs: 3200,
    estimatedCostPer1k: 0.18,
    successRate: 0.98,
    hallucinationRate: 0.02,
    toolAccuracy: 0.95,
    guardrailTriggerRate: 0.03,
    avgRetryCount: 0.1,
    totalRuns: 15000,
    inputCostPer1k: 0.10,
    outputCostPer1k: 0.30,
    lastRun: '2026-04-03T18:30:00Z',
  },
});
```

See [docs/schema-guide.md](docs/schema-guide.md) for the full reference of every field.

## Configuration

Create an `archon.config.ts` (or `.js` / `.mjs`) in your project root:

```typescript
import { defineConfig } from 'archon';

export default defineConfig({
  // Glob patterns to find *.agent.ts files
  include: [
    'src/**/*.agent.ts',
    'agents/**/*.agent.ts',
  ],

  // Markdown scanner for legacy agent docs
  markdown: {
    enabled: true,
    paths: ['.agents/**/*.md'],
  },

  // Named pipelines (rendered as DAG graphs)
  pipelines: [
    {
      id: 'episode-processing',
      name: 'Episode Processing Pipeline',
      description: 'From raw audio to published YouTube content',
      stages: [
        'transcript-parsing',
        'hook-detection',
        'gpt-analysis',
        'thumbnail-pipeline',
      ],
    },
  ],

  // UI settings
  ui: {
    title: 'My Agent Catalog',
    port: 6006,
    immersive: false, // Enable Three.js 3D view
  },

  // Telemetry (future)
  telemetry: {
    enabled: false,
    anonymous: true,
  },
});
```

## Project Structure

```
my-project/
  archon.config.ts          # Archon configuration
  src/
    agents/
      parser.agent.ts       # Agent definition (auto-discovered)
      analyzer.agent.ts
    services/
      transcriber.agent.ts
  .agents/                  # Markdown agent docs (optional)
    episodes/
      01_TRANSCRIPTION.md
      02_HOOK_DETECTION.md
```

Archon discovers agents by scanning for files matching the `include` glob patterns. Each file must export a default `defineAgent()` call. The file naming convention is `*.agent.ts`.

## CLI Commands

| Command | Description |
|---------|-------------|
| `archon dev` | Start the agent viewer (Next.js dev server on port 6006 with Turbopack) |
| `archon init` | Scaffold an `archon.config.ts` and an example `*.agent.ts` file *(coming soon)* |
| `archon build` | Build a static agent catalog for deployment *(coming soon)* |

## Monorepo Usage

Archon lives inside a Turborepo monorepo. Common commands:

```bash
# Start Archon in dev mode (scans real *.agent.ts files)
pnpm dev

# Start Archon in mock mode (uses built-in mock data, no scanning)
pnpm dev:mock

# Type-check
pnpm lint

# Build for production
pnpm build
```

When running via the CLI from an external project:

```bash
npx archon dev      # Scans the current directory for agents
```

## Roadmap

### Phase 1: Foundation (done)
- `defineAgent()` schema with Zod validation
- File scanner for `*.agent.ts` files
- Agent catalog grid with cards
- Agent detail view (schemas, prompts, config, metrics)
- Mock mode for UI development
- Shell layout with sidebar navigation

### Phase 2: Pipeline + Three.js + Markdown Scanner (done)
- Pipeline DAG graph with React Flow
- Topological layering based on `dependsOn`
- Three.js immersive view with agent avatars
- Markdown scanner for legacy `.agents/*.md` documentation
- Enriched schema: guardrails, handoffs, tools, hooks, evaluations, runtime, SLA, secrets
- Aurora background and glass panel UI

### Phase 3: Telemetry + Playground + npm Publish
- Live telemetry dashboard (OTel GenAI integration)
- Agent playground (send test inputs, see outputs)
- Publish `archon` to npm as a standalone CLI tool
- `archon init` scaffolding command
- `archon build` static export

### Phase 4: Framework Adapters
- OpenAI Agents SDK scanner (auto-extract agent definitions from Python/TS)
- CrewAI scanner
- LangGraph scanner
- A2A Agent Card exporter
- MCP tool catalog integration

## Standards Alignment

Archon's schema and roadmap are informed by emerging industry standards:

- **A2A Agent Cards** -- The `AgentDefinition` schema maps naturally to Google's Agent-to-Agent protocol Agent Cards (name, description, capabilities, skills).
- **OpenTelemetry GenAI** -- The `metrics` field aligns with OTel GenAI semantic conventions (token counts, latency, cost). Phase 3 will add live OTel integration.
- **Model Context Protocol (MCP)** -- Tools can reference MCP servers via the `mcpServer` field on `ToolDefinition`. Phase 4 will add full MCP tool catalog browsing.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run type-checking: `pnpm lint`
5. Start the dev server and verify: `pnpm dev:mock`
6. Commit and push
7. Open a Pull Request

### Development Setup

```bash
# Clone the monorepo
git clone <repo-url>
cd vision-monorepo/packages/archon

# Install dependencies
pnpm install

# Start in mock mode (recommended for UI work)
pnpm dev:mock

# Start with real agent scanning
pnpm dev
```

### Key Directories

| Path | Description |
|------|-------------|
| `src/schema/` | Zod schemas (`agent.ts`, `config.ts`, `pipeline.ts`) |
| `src/scanner/` | File scanner, Markdown scanner, config loader, registry |
| `src/components/` | React components (catalog, detail, pipeline, immersive, UI) |
| `src/app/` | Next.js App Router pages and API routes |
| `src/mocks/` | Mock agent and pipeline data |
| `src/cli/` | CLI entry point and `dev` command |
| `examples/` | Example `*.agent.ts` files |
| `docs/` | Documentation (schema guide, best practices) |

## License

MIT
