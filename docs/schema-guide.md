# Schema Guide -- `AgentDefinition` Reference

This document covers every field in the `AgentDefinition` schema. All types are validated at definition time using Zod. Optional fields default to `undefined` unless a default is noted.

Source: `src/schema/agent.ts`

---

## Identity

Fields that uniquely identify and describe the agent.

### `id`

| Type | Default | Required |
|------|---------|----------|
| `string` | -- | Yes |

A unique identifier for the agent. Used as the key in the registry, in `dependsOn`/`feeds` references, and in pipeline `stages` arrays.

```typescript
id: 'hook-detection'
```

**Best practice:** Use kebab-case. Keep it short but descriptive. The ID should be stable across versions -- renaming it breaks pipeline references.

---

### `name`

| Type | Default | Required |
|------|---------|----------|
| `string` | -- | Yes |

Human-readable display name shown in the catalog UI and detail views.

```typescript
name: 'Hook Detection'
```

**Best practice:** Use title case. Keep it under 40 characters so it fits well in card layouts.

---

### `description`

| Type | Default | Required |
|------|---------|----------|
| `string` | -- | Yes |

A concise explanation of what the agent does. Shown on catalog cards and in the detail view header.

```typescript
description: 'Detects high-retention viral hooks in transcripts before chapter generation.'
```

**Best practice:** Lead with a verb. Include the "why" -- not just the "what". Aim for 1-2 sentences (under 200 characters for clean card display).

---

### `version`

| Type | Default | Required |
|------|---------|----------|
| `string` | `'1.0.0'` | No |

Semantic version of the agent definition. Useful for tracking schema changes over time.

```typescript
version: '2.0.0'
```

**Best practice:** Follow semver. Bump the major version when input/output schemas change in breaking ways.

---

### `module`

| Type | Default | Required |
|------|---------|----------|
| `string` | `undefined` | No |

Logical grouping for the agent. Used for filtering and organization in the catalog.

```typescript
module: 'episodes'
```

**Best practice:** Use the same module name for agents that belong to the same domain. Common patterns: `episodes`, `services`, `tools`, `analytics`.

---

## Model

Fields that describe which AI model the agent uses and how it is configured.

### `model`

| Type | Default | Required |
|------|---------|----------|
| `string` | `undefined` | No |

The model identifier. Omit for non-AI agents (pure data transformations).

```typescript
model: 'gpt-5.2'
```

**Best practice:** Use the exact model string your SDK expects. Include the version suffix so the definition stays accurate even after provider updates.

---

### `provider`

| Type | Default | Required |
|------|---------|----------|
| `'openai' \| 'anthropic' \| 'google' \| 'custom'` | `undefined` | No |

The model provider. Used for UI badges and cost estimation.

```typescript
provider: 'openai'
```

**Best practice:** Always set this alongside `model` so the catalog can show provider icons and color-coding.

---

### `config`

| Type | Default | Required |
|------|---------|----------|
| `AgentConfig` | `undefined` | No |

Model tuning, retry, rate limiting, and caching configuration. All sub-fields are optional.

```typescript
config: {
  temperature: 0.3,
  maxTokens: 3000,
  reasoning: { effort: 'low' },
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryableErrors: ['RATE_LIMIT', 'TIMEOUT'],
  rateLimit: 100,
  streaming: false,
  caching: true,
  cacheTtl: 3600,
}
```

#### `config.temperature`

| Type | Range | Default |
|------|-------|---------|
| `number` | `0` - `2` | `undefined` |

Sampling temperature. Lower values produce more deterministic output.

#### `config.maxTokens`

| Type | Default |
|------|---------|
| `number` | `undefined` |

Maximum tokens in the model response. Set to `0` for non-AI agents (pure transformation).

#### `config.reasoning`

| Type | Default |
|------|---------|
| `{ effort: 'low' \| 'medium' \| 'high' }` | `undefined` |

Reasoning effort level (for models that support it, such as OpenAI o-series).

#### `config.caching`

| Type | Default |
|------|---------|
| `boolean` | `undefined` |

Whether to enable response caching for this agent.

#### `config.maxRetries`

| Type | Default |
|------|---------|
| `number` | `undefined` |

Maximum number of retry attempts on failure.

#### `config.retryBackoff`

| Type | Default |
|------|---------|
| `'none' \| 'linear' \| 'exponential'` | `undefined` |

Backoff strategy between retries.

#### `config.retryableErrors`

| Type | Default |
|------|---------|
| `string[]` | `undefined` |

Error codes that should trigger a retry (matches against `errors[].code`).

#### `config.rateLimit`

| Type | Default |
|------|---------|
| `number` | `undefined` |

Maximum requests per minute to this agent.

#### `config.streaming`

| Type | Default |
|------|---------|
| `boolean` | `undefined` |

Whether the agent supports streaming responses.

#### `config.cacheTtl`

| Type | Default |
|------|---------|
| `number` | `undefined` |

Cache time-to-live in seconds.

**Best practice:** Always declare `maxRetries` and `retryBackoff` for agents that call external APIs. Use `retryableErrors` to scope retries only to transient failures.

---

## I/O

Fields that describe the agent's input and output contracts.

### `input`

| Type | Default | Required |
|------|---------|----------|
| `AgentIOSchema` | `undefined` | No |

Describes what the agent receives.

```typescript
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
}
```

#### `input.description`

Human-readable summary of the input shape.

#### `input.schema`

A Zod schema (or any object) describing the input type. Displayed as a type reference in the UI. Note: Zod schemas are serialized as string descriptions in the API -- they are not transmitted as executable code.

#### `input.example`

A concrete example input payload. Shown in the detail view and used as seed data for the future playground feature.

**Best practice:** Always provide both `description` and `example`. The `example` makes the agent instantly understandable to new team members.

---

### `output`

| Type | Default | Required |
|------|---------|----------|
| `AgentIOSchema` | `undefined` | No |

Describes what the agent produces. Same sub-fields as `input`.

```typescript
output: {
  description: 'Array of detected hooks with viral scores',
  schema: z.object({
    hooks: z.array(z.object({
      timestamp: z.string(),
      quote: z.string(),
      strength: z.number(),
    })),
  }),
  example: {
    hooks: [{ timestamp: '2:30', quote: '...', strength: 9 }],
  },
}
```

**Best practice:** The `output.example` should be a realistic response -- not a truncated placeholder. This is the first thing a new developer reads to understand what the agent produces.

---

## Prompt

### `prompt`

| Type | Default | Required |
|------|---------|----------|
| `string` | `undefined` | No |

The system prompt or instruction template sent to the model.

```typescript
prompt: `<role>
You are a VIRAL CONTENT ANALYST specialized in YouTube retention.
</role>

<task>
Extract the strongest hooks from the transcript.
</task>`
```

**Best practice:** Use XML tags to structure prompts (`<role>`, `<task>`, `<output_format>`, `<constraints>`). This improves model comprehension and makes prompts scannable in the UI.

---

## Graph

Fields that define how agents relate to each other in pipelines.

### `dependsOn`

| Type | Default | Required |
|------|---------|----------|
| `string[]` | `undefined` | No |

IDs of agents that must run before this one. Used by the Pipeline Graph to draw dependency edges and compute topological layers.

```typescript
dependsOn: ['transcript-parsing', 'hook-detection']
```

**Best practice:** Only list direct dependencies. The pipeline graph resolves transitive dependencies automatically.

---

### `feeds`

| Type | Default | Required |
|------|---------|----------|
| `string[]` | `undefined` | No |

IDs of agents that consume this agent's output. The inverse of `dependsOn` -- useful for forward-looking documentation.

```typescript
feeds: ['gpt-analysis', 'trend-titles']
```

**Best practice:** Keep `feeds` consistent with downstream agents' `dependsOn`. If agent A feeds agent B, then B should list A in its `dependsOn`.

---

### `tools`

| Type | Default | Required |
|------|---------|----------|
| `(string \| ToolDefinition)[]` | `undefined` | No |

Tools available to the agent. Can be simple string references or full `ToolDefinition` objects.

```typescript
// Simple references
tools: ['web-search', 'calculator']

// Detailed definitions
tools: [
  {
    name: 'sentiment-analysis',
    description: 'Analyze emotional tone of text',
    inputSchema: { text: 'string' },
    outputSchema: { sentiment: 'string', score: 'number' },
    mcpServer: 'sentiment-mcp',  // Optional MCP server reference
  },
]
```

#### `ToolDefinition` fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Tool identifier |
| `description` | `string` | No | What the tool does |
| `inputSchema` | `any` | No | Expected input shape |
| `outputSchema` | `any` | No | Expected output shape |
| `mcpServer` | `string` | No | MCP server that provides this tool |

**Best practice:** Use string references for well-known tools. Use full `ToolDefinition` objects for custom or complex tools so they are self-documenting in the catalog.

---

### `handoffs`

| Type | Default | Required |
|------|---------|----------|
| `Handoff[]` | `undefined` | No |

Defines when and how this agent transfers control to another agent.

```typescript
handoffs: [
  {
    targetAgentId: 'manual-review',
    condition: 'When confidence < 0.5',
    transferData: true,
  },
]
```

#### `Handoff` fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `targetAgentId` | `string` | -- | ID of the agent to hand off to |
| `condition` | `string` | `undefined` | Human-readable condition that triggers the handoff |
| `transferData` | `boolean` | `true` | Whether to pass the current agent's output to the target |

**Best practice:** Use handoffs for escalation paths (e.g., low confidence -> human review) and for routing decisions (e.g., language detection -> specialized agent).

---

## Guardrails

### `guardrails`

| Type | Default | Required |
|------|---------|----------|
| `Guardrail[]` | `undefined` | No |

Safety checks applied to agent inputs, outputs, or both.

```typescript
guardrails: [
  {
    name: 'input-length-check',
    type: 'input',
    description: 'Reject transcripts shorter than 100 words',
    validator: 'inputLengthValidator',
    failAction: 'block',
  },
  {
    name: 'pii-filter',
    type: 'output',
    description: 'Strip PII from output',
    failAction: 'warn',
  },
]
```

#### `Guardrail` fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | -- | Guardrail identifier |
| `type` | `'input' \| 'output' \| 'both'` | -- | When the guardrail runs |
| `description` | `string` | `undefined` | What the guardrail checks |
| `validator` | `string` | `undefined` | Reference to the validator function/module |
| `failAction` | `'block' \| 'warn' \| 'fallback'` | `'block'` | What happens when the guardrail triggers |

**Best practice:** Always add input guardrails for agents that process external/user-facing data. Use `block` for safety-critical checks and `warn` for soft quality checks.

---

## Errors

### `errors`

| Type | Default | Required |
|------|---------|----------|
| `AgentError[]` | `undefined` | No |

Known error conditions the agent can produce.

```typescript
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
]
```

#### `AgentError` fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `code` | `string` | -- | Unique error code (use SCREAMING_SNAKE_CASE) |
| `description` | `string` | -- | What causes this error |
| `recoverable` | `boolean` | `false` | Whether the error can be retried |
| `retryStrategy` | `'none' \| 'immediate' \| 'exponential'` | `undefined` | Retry strategy for recoverable errors |

**Best practice:** Declare every known error. Pair recoverable errors with a `retryStrategy`. Reference error codes in `config.retryableErrors` to automate retry logic.

---

## Evaluations

### `evaluations`

| Type | Default | Required |
|------|---------|----------|
| `Evaluation[]` | `undefined` | No |

Historical evaluation results against test datasets.

```typescript
evaluations: [
  {
    dataset: 'hook-detection-v2',
    date: '2026-03-15',
    scores: { precision: 0.92, recall: 0.87, f1: 0.89 },
    notes: 'Tested against 500 human-labeled segments',
  },
]
```

#### `Evaluation` fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dataset` | `string` | `undefined` | Name or path of the test dataset |
| `date` | `string` | `undefined` | When the evaluation was run (ISO date) |
| `scores` | `Record<string, number>` | `undefined` | Metric name to score mapping |
| `notes` | `string` | `undefined` | Additional context about the evaluation |

**Best practice:** Run evaluations after every prompt or schema change. Track at least precision, recall, and F1 for classification agents. For generative agents, track coherence and factuality scores.

---

## Hooks

### `hooks`

| Type | Default | Required |
|------|---------|----------|
| `AgentHook[]` | `undefined` | No |

Lifecycle hooks for observability and side effects.

```typescript
hooks: [
  { event: 'beforeRun', description: 'Validate input format' },
  { event: 'afterRun', description: 'Log to telemetry' },
  { event: 'onError', description: 'Send alert to Slack' },
  { event: 'onRetry', description: 'Increment retry counter' },
  { event: 'onHandoff', description: 'Log handoff reason' },
  { event: 'onToolCall', description: 'Track tool usage' },
]
```

#### `AgentHook` fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `event` | `'beforeRun' \| 'afterRun' \| 'onError' \| 'onRetry' \| 'onHandoff' \| 'onToolCall'` | -- | Lifecycle event |
| `handler` | `string` | `undefined` | Reference to the handler function/module |
| `description` | `string` | `undefined` | What the hook does |

**Best practice:** Use `beforeRun` for validation and enrichment, `afterRun` for telemetry and caching, and `onError` for alerting. Keep hooks lightweight -- they should not contain business logic.

---

## Runtime

### `runtime`

| Type | Default | Required |
|------|---------|----------|
| `Runtime` | `undefined` | No |

Infrastructure requirements for deploying the agent.

```typescript
runtime: {
  memory: '512Mi',
  gpu: false,
  timeout: 30000,
  concurrency: 10,
}
```

#### `Runtime` fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `memory` | `string` | `undefined` | Memory limit (e.g., `'256Mi'`, `'1Gi'`) |
| `gpu` | `boolean` | `false` | Whether the agent requires GPU access |
| `timeout` | `number` | `undefined` | Maximum execution time in milliseconds |
| `concurrency` | `number` | `undefined` | Maximum concurrent executions |

**Best practice:** Always set `timeout` to prevent runaway executions. Set `concurrency` based on your provider's rate limits and your budget.

---

## SLA

### `sla`

| Type | Default | Required |
|------|---------|----------|
| `Sla` | `undefined` | No |

Service-level agreement targets for the agent.

```typescript
sla: {
  targetUptime: 0.999,
  maxLatencyMs: 5000,
  maxCostPerCall: 0.05,
}
```

#### `Sla` fields

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `targetUptime` | `number` | `0` - `1` | Target availability (e.g., `0.999` = 99.9%) |
| `maxLatencyMs` | `number` | -- | Maximum acceptable p95 latency in milliseconds |
| `maxCostPerCall` | `number` | -- | Maximum acceptable cost per invocation in USD |

**Best practice:** Define SLA targets even during development. They serve as guardrails for model selection and prompt optimization decisions.

---

## Secrets & Capabilities

### `secrets`

| Type | Default | Required |
|------|---------|----------|
| `string[]` | `undefined` | No |

Environment variables or secret names the agent requires at runtime.

```typescript
secrets: ['OPENAI_API_KEY', 'DATABASE_URL']
```

**Best practice:** Always declare secrets so the catalog shows what credentials are needed. Never put actual secret values in the agent definition.

---

### `capabilities`

| Type | Default | Required |
|------|---------|----------|
| `string[]` | `undefined` | No |

Abstract capabilities this agent provides. Maps to A2A Agent Card skills.

```typescript
capabilities: ['text-analysis', 'content-scoring', 'hook-extraction']
```

**Best practice:** Use lowercase kebab-case. These capabilities can be used for agent discovery in multi-agent systems.

---

## Metadata

Fields for catalog organization, lifecycle management, and observability.

### `tags`

| Type | Default | Required |
|------|---------|----------|
| `string[]` | `undefined` | No |

Free-form tags for search and filtering in the catalog.

```typescript
tags: ['viral', 'hooks', 'retention', 'youtube']
```

**Best practice:** Use lowercase. Include the domain (`youtube`), the technique (`hooks`), and the purpose (`retention`).

---

### `author`

| Type | Default | Required |
|------|---------|----------|
| `string` | `undefined` | No |

Who created or maintains the agent.

```typescript
author: 'vision-team'
```

---

### `status`

| Type | Default | Required |
|------|---------|----------|
| `'active' \| 'deprecated' \| 'experimental' \| 'legacy'` | `'active'` | No |

Lifecycle status of the agent. Shown as a colored badge in the catalog.

```typescript
status: 'active'
```

| Status | Meaning |
|--------|---------|
| `active` | Production-ready, actively maintained |
| `experimental` | In development, API may change |
| `deprecated` | Replaced by a newer agent, will be removed |
| `legacy` | Imported from Markdown docs, needs migration to `defineAgent()` |

**Best practice:** Set agents to `deprecated` (not deleted) when replacing them. Set `sunsetsAt` to communicate the removal timeline.

---

### `sunsetsAt`

| Type | Default | Required |
|------|---------|----------|
| `string` | `undefined` | No |

ISO date string indicating when a deprecated agent will be removed.

```typescript
sunsetsAt: '2026-06-01'
```

---

### `metrics`

| Type | Default | Required |
|------|---------|----------|
| `AgentMetrics` | `undefined` | No |

Observed performance and cost metrics.

```typescript
metrics: {
  // Core performance
  avgTokensIn: 8000,
  avgTokensOut: 1200,
  avgLatencyMs: 3200,
  estimatedCostPer1k: 0.18,
  successRate: 0.98,
  lastRun: '2026-04-03T18:30:00Z',

  // Quality & reliability
  hallucinationRate: 0.02,
  toolAccuracy: 0.95,
  guardrailTriggerRate: 0.03,
  avgRetryCount: 0.1,
  totalRuns: 15000,

  // Cost breakdown
  inputCostPer1k: 0.10,
  outputCostPer1k: 0.30,
}
```

#### `AgentMetrics` fields

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `avgTokensIn` | `number` | -- | Average input tokens per call |
| `avgTokensOut` | `number` | -- | Average output tokens per call |
| `avgLatencyMs` | `number` | -- | Average end-to-end latency in ms |
| `estimatedCostPer1k` | `number` | -- | Estimated cost per 1,000 calls in USD |
| `successRate` | `number` | `0` - `1` | Fraction of calls that succeed |
| `lastRun` | `string` | -- | ISO timestamp of the most recent execution |
| `hallucinationRate` | `number` | `0` - `1` | Fraction of calls with detected hallucinations |
| `toolAccuracy` | `number` | `0` - `1` | Fraction of tool calls that produce correct results |
| `guardrailTriggerRate` | `number` | `0` - `1` | Fraction of calls where a guardrail fires |
| `avgRetryCount` | `number` | -- | Average number of retries per call |
| `totalRuns` | `number` | -- | Total number of executions since tracking began |
| `inputCostPer1k` | `number` | -- | Input token cost per 1,000 calls in USD |
| `outputCostPer1k` | `number` | -- | Output token cost per 1,000 calls in USD |

**Best practice:** Track at least `successRate`, `avgLatencyMs`, and `estimatedCostPer1k` as the minimum observability triad. Add `hallucinationRate` for agents that generate user-facing content.

---

### `sourceFile`

| Type | Default | Required |
|------|---------|----------|
| `string` | `undefined` | No |

Path to the `*.agent.ts` source file. **Populated automatically by the scanner** -- do not set manually.

---

### `documentationFile`

| Type | Default | Required |
|------|---------|----------|
| `string` | `undefined` | No |

Path to the Markdown documentation file (for agents discovered by the Markdown Scanner). **Populated automatically** -- do not set manually.

---

## Related Schemas

### `PipelineDefinition`

Defined in `src/schema/pipeline.ts`. Used in `archon.config.ts` to declare named pipelines.

```typescript
import { definePipeline } from 'archon';

export const myPipeline = definePipeline({
  id: 'episode-processing',
  name: 'Episode Processing Pipeline',
  description: 'From raw audio to published YouTube content',
  stages: ['transcript-parsing', 'hook-detection', 'gpt-analysis', 'thumbnail-pipeline'],
  triggers: ['manual', 'webhook'],
  schedule: '0 8 * * MON',
  timeout: 300000,
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique pipeline identifier |
| `name` | `string` | Yes | Display name |
| `description` | `string` | No | What the pipeline does |
| `stages` | `string[]` | Yes | Ordered list of agent IDs |
| `triggers` | `string[]` | No | What triggers the pipeline |
| `schedule` | `string` | No | Cron expression for scheduled runs |
| `timeout` | `number` | No | Pipeline-level timeout in milliseconds |

### `ArchonConfig`

Defined in `src/schema/config.ts`. See the main [README](../README.md) Configuration section for usage.
