# Best Practices for Agent Development

This guide covers patterns and recommendations for designing, building, and operating AI agents with Archon. These practices are informed by real-world production experience and are surfaced as automated recommendations in the Archon catalog.

---

## Table of Contents

1. [Guardrails](#guardrails)
2. [Prompt Engineering](#prompt-engineering)
3. [Error Handling](#error-handling)
4. [Tool Design](#tool-design)
5. [Pipeline Design](#pipeline-design)
6. [Metrics and Observability](#metrics-and-observability)
7. [Security](#security)
8. [Testing and Evaluations](#testing-and-evaluations)

---

## Guardrails

Guardrails are safety checks that validate agent inputs and outputs. They are your first line of defense against malformed data, prompt injection, and harmful output.

### Always guard external input

Any agent that receives input from users, webhooks, or external APIs should have at least one `input` guardrail.

```typescript
guardrails: [
  {
    name: 'input-sanitization',
    type: 'input',
    description: 'Strip HTML, validate length, reject empty input',
    failAction: 'block',
  },
]
```

### Guard output for user-facing agents

Agents whose output is shown directly to users should have `output` guardrails for PII filtering, toxicity checks, and format validation.

```typescript
guardrails: [
  {
    name: 'pii-filter',
    type: 'output',
    description: 'Detect and redact email addresses, phone numbers, SSNs',
    failAction: 'block',
  },
  {
    name: 'format-validation',
    type: 'output',
    description: 'Ensure output matches expected JSON schema',
    failAction: 'fallback',
  },
]
```

### Choose the right `failAction`

| Action | Use when |
|--------|----------|
| `block` | Safety-critical: PII, injection, invalid data. Reject the request entirely. |
| `warn` | Quality checks: output could be better but is not dangerous. Log and continue. |
| `fallback` | Have a safe default to return when the guardrail fires (e.g., a cached response). |

### How many guardrails?

- **Minimum for external-facing agents:** 1 input guardrail + 1 output guardrail
- **Minimum for internal agents:** 1 input guardrail (schema validation at minimum)
- **Non-AI agents** (pure transformations): input validation is usually sufficient

---

## Prompt Engineering

Well-structured prompts are the single biggest lever for agent quality.

### Use XML tags to structure prompts

XML tags improve model comprehension, make prompts scannable, and create clear boundaries between instructions.

```typescript
prompt: `<role>
You are an EXPERT PODCAST ANALYST with deep knowledge of YouTube SEO.
</role>

<task>
Analyze the transcript and extract high-retention hooks.
For each hook, identify the type, quote the text, and rate its viral potential.
</task>

<output_format>
Return valid JSON matching the output schema. No markdown. No explanations.
</output_format>

<constraints>
- Maximum 10 hooks per transcript
- Only include hooks with strength >= 5
- Quote the exact text, do not paraphrase
</constraints>`
```

### Recommended XML tag taxonomy

| Tag | Purpose |
|-----|---------|
| `<role>` | Who the model should act as |
| `<task>` | What to do (the core instruction) |
| `<output_format>` | Expected response structure |
| `<constraints>` | Boundaries and limitations |
| `<context>` | Background information |
| `<examples>` | Few-shot examples |
| `<definitions>` | Domain-specific terminology |

### Use Chain of Thought for complex reasoning

For agents that need to analyze, compare, or make judgments, explicitly request reasoning steps.

```typescript
config: {
  reasoning: { effort: 'medium' },
},
prompt: `<task>
Analyze this transcript in TWO phases:
Phase 1: Deep analysis with reasoning (think step by step)
Phase 2: Format your analysis into the output schema
</task>`
```

### Define the role clearly

A specific role produces better results than a generic one.

```
// Bad
<role>You are a helpful assistant.</role>

// Good
<role>
You are a VIRAL CONTENT ANALYST specialized in YouTube retention optimization.
Your expertise: identifying moments that make viewers stop scrolling.
You have 10 years of experience analyzing podcast transcripts for viral potential.
</role>
```

### Constrain output format explicitly

Models are more reliable when you specify the exact format.

```
<output_format>
ALWAYS return valid JSON. No markdown fences. No explanations outside the JSON.
The JSON must match this structure exactly:
{
  "hooks": [{ "timestamp": "string", "quote": "string", "strength": number }]
}
</output_format>
```

---

## Error Handling

Declaring errors makes your agents self-documenting and enables automated retry logic.

### Declare every known error

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
  {
    code: 'TIMEOUT',
    description: 'Model did not respond within the timeout',
    recoverable: true,
    retryStrategy: 'immediate',
  },
  {
    code: 'MALFORMED_OUTPUT',
    description: 'Model returned invalid JSON',
    recoverable: true,
    retryStrategy: 'immediate',
  },
]
```

### Use retries for transient failures

Transient failures (rate limits, timeouts, network errors) should always be retried. Pair them with appropriate backoff.

| Error type | Retry strategy |
|------------|---------------|
| Rate limit | `exponential` (back off to respect limits) |
| Timeout | `immediate` (try again right away) |
| Network error | `exponential` |
| Malformed output | `immediate` (model may produce valid output on retry) |
| Invalid input | `none` (do not retry -- fix the input) |
| Auth failure | `none` (do not retry -- fix the credentials) |

### Wire retries to config

```typescript
config: {
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryableErrors: ['RATE_LIMIT', 'TIMEOUT', 'MALFORMED_OUTPUT'],
},
errors: [
  { code: 'RATE_LIMIT', description: '...', recoverable: true, retryStrategy: 'exponential' },
  { code: 'TIMEOUT', description: '...', recoverable: true, retryStrategy: 'immediate' },
]
```

### Do not retry non-recoverable errors

If the input is invalid or the API key is wrong, retrying wastes money and time. Mark these as `recoverable: false`.

---

## Tool Design

Tools extend what an agent can do. Well-designed tools make agents more capable and reliable.

### Prefer specific tools over general tools

```typescript
// Bad: one mega-tool that does everything
tools: ['do-everything']

// Good: focused tools with clear responsibilities
tools: [
  'web-search',
  'google-trends-api',
  { name: 'sentiment-analysis', description: 'Analyze emotional tone of text' },
]
```

### Always describe tools

When using `ToolDefinition` objects, always include a `description`. Models use this to decide when and how to invoke tools.

```typescript
tools: [
  {
    name: 'background-removal',
    description: 'Remove the background from an image, returning a transparent PNG',
    inputSchema: { imageUrl: 'string' },
    outputSchema: { transparentImageUrl: 'string' },
  },
]
```

### Document tool I/O schemas

Include `inputSchema` and `outputSchema` so the catalog shows what each tool expects and returns. This also helps models construct correct tool calls.

### Reference MCP servers when applicable

If a tool is provided by an MCP server, set the `mcpServer` field for discoverability.

```typescript
tools: [
  {
    name: 'notion-query',
    description: 'Query a Notion database',
    mcpServer: 'notion-mcp',
  },
]
```

---

## Pipeline Design

Pipelines orchestrate multiple agents into a data processing flow.

### Keep agents focused

Each agent should do one thing well. If an agent description contains "and" more than once, it is probably doing too much.

```
// Bad: one agent that does everything
description: 'Transcribe audio and detect hooks and generate chapters and create thumbnails'

// Good: four focused agents in a pipeline
stages: ['transcription', 'hook-detection', 'chapter-generation', 'thumbnail-creation']
```

### Use `dependsOn` for data dependencies

Express real data dependencies, not just ordering. If agent B needs the output of agent A, declare it.

```typescript
// In hook-detection.agent.ts
dependsOn: ['transcript-parsing']

// In gpt-analysis.agent.ts
dependsOn: ['transcript-parsing', 'hook-detection']
```

### Use `feeds` for forward documentation

`feeds` is the inverse of `dependsOn`. It answers "who consumes my output?" which is valuable for impact analysis.

```typescript
// In transcript-parsing.agent.ts
feeds: ['hook-detection', 'gpt-analysis']
```

### Use `handoffs` for conditional routing

When an agent needs to delegate to another agent based on runtime conditions (not static data flow), use `handoffs`.

```typescript
handoffs: [
  {
    targetAgentId: 'manual-review',
    condition: 'When confidence < 0.5 or content is flagged',
    transferData: true,
  },
  {
    targetAgentId: 'auto-publish',
    condition: 'When confidence >= 0.9 and no guardrails triggered',
    transferData: true,
  },
]
```

### Design for parallelism

Agents at the same topological layer run in parallel. Design your pipeline so independent work happens at the same depth.

```
Layer 0: [transcription]
Layer 1: [transcript-parsing]
Layer 2: [hook-detection]           -- runs in parallel with nothing else
Layer 3: [gpt-analysis]             -- waits for both parsing + hooks
Layer 4: [thumbnails, titles, clips] -- all three run in parallel
```

---

## Metrics and Observability

You cannot improve what you do not measure.

### The minimum observability triad

Every agent should track at least these three metrics:

```typescript
metrics: {
  successRate: 0.98,     // Are calls succeeding?
  avgLatencyMs: 3200,    // How fast is it?
  estimatedCostPer1k: 0.18, // How much does it cost?
}
```

### Add quality metrics for production agents

```typescript
metrics: {
  // ... minimum triad ...
  hallucinationRate: 0.02,       // Is it making things up?
  toolAccuracy: 0.95,            // Are tool calls correct?
  guardrailTriggerRate: 0.03,    // How often do guardrails fire?
  avgRetryCount: 0.1,            // How often do retries happen?
  totalRuns: 15000,              // Volume context
}
```

### Track token counts for cost optimization

```typescript
metrics: {
  avgTokensIn: 8000,
  avgTokensOut: 1200,
  inputCostPer1k: 0.10,
  outputCostPer1k: 0.30,
}
```

Token counts reveal optimization opportunities. If `avgTokensIn` is high, consider summarizing inputs. If `avgTokensOut` is high, consider constraining the output format.

### Keep `lastRun` fresh

```typescript
metrics: {
  lastRun: '2026-04-03T18:30:00Z',
}
```

A stale `lastRun` is a signal that the agent may be abandoned or broken.

### Compare metrics against SLA

Pair your `metrics` with `sla` targets to surface violations:

```typescript
sla: {
  targetUptime: 0.999,
  maxLatencyMs: 5000,
  maxCostPerCall: 0.05,
},
metrics: {
  successRate: 0.98,       // Below 0.999 target -- investigate
  avgLatencyMs: 3200,      // Within 5000ms target -- OK
  estimatedCostPer1k: 0.18, // $0.00018/call, within $0.05 -- OK
}
```

---

## Security

### Declare all secrets

Every API key, database credential, or token the agent needs should be listed in `secrets`.

```typescript
secrets: ['OPENAI_API_KEY', 'DATABASE_URL', 'SLACK_WEBHOOK']
```

This serves two purposes:
1. **Documentation:** New developers know what credentials are needed
2. **Audit:** Security reviews can scan `secrets` fields across all agents

### Never hardcode API keys

Do not put actual secret values anywhere in the agent definition, prompt, or example payloads.

```typescript
// NEVER do this
prompt: 'Use API key sk-abc123 to call...'

// Instead
secrets: ['OPENAI_API_KEY']
prompt: 'Use the configured API key to call...'
```

### Use input guardrails to prevent injection

Agents that process user input should guard against prompt injection.

```typescript
guardrails: [
  {
    name: 'prompt-injection-detector',
    type: 'input',
    description: 'Detect and block prompt injection attempts',
    failAction: 'block',
  },
]
```

### Scope capabilities narrowly

Only declare capabilities the agent actually provides. Overly broad capabilities in multi-agent systems can lead to incorrect routing.

```typescript
// Bad
capabilities: ['text', 'analysis', 'general']

// Good
capabilities: ['hook-extraction', 'viral-content-scoring']
```

---

## Testing and Evaluations

### Use the `evaluations` field

Track evaluation results directly in the agent definition. This creates a living history of quality over time.

```typescript
evaluations: [
  {
    dataset: 'hook-detection-v2',
    date: '2026-03-15',
    scores: { precision: 0.92, recall: 0.87, f1: 0.89 },
    notes: 'Tested against 500 human-labeled podcast segments',
  },
  {
    dataset: 'hook-detection-v2',
    date: '2026-02-01',
    scores: { precision: 0.85, recall: 0.80, f1: 0.82 },
    notes: 'Baseline before prompt refactoring',
  },
]
```

### Run evaluations after every change

Prompt changes, model upgrades, and schema modifications should all trigger a re-evaluation. Compare the new scores against previous entries to catch regressions.

### Choose the right metrics for your agent type

| Agent type | Key metrics |
|------------|-------------|
| Classification (hook detection) | Precision, recall, F1 |
| Generation (descriptions, titles) | Coherence, factuality, readability |
| Extraction (metadata, chapters) | Accuracy, completeness |
| Transformation (parsing) | Correctness (100% target) |

### Test with realistic data

Use `input.example` and `output.example` as your starting point for test data. Build evaluation datasets from real production inputs (anonymized if needed).

### Test edge cases explicitly

Build dataset entries for:
- Empty input
- Extremely long input (token limit boundaries)
- Multilingual content
- Adversarial input (injection attempts)
- Missing optional fields

---

## Summary Checklist

Use this checklist when reviewing an agent definition:

- [ ] `id`, `name`, and `description` are set and descriptive
- [ ] `version` follows semver
- [ ] `model` and `provider` are set (if AI-powered)
- [ ] `input` and `output` have descriptions and examples
- [ ] `prompt` uses XML tags for structure
- [ ] `dependsOn` and `feeds` are consistent across the pipeline
- [ ] At least one `guardrail` for external input
- [ ] All known `errors` are declared
- [ ] Recoverable errors have `retryStrategy`
- [ ] `config.maxRetries` and `retryBackoff` are set
- [ ] `metrics` include successRate, avgLatencyMs, estimatedCostPer1k
- [ ] `sla` targets are defined
- [ ] `secrets` are declared (not hardcoded)
- [ ] `evaluations` track quality over time
- [ ] `status` reflects the current lifecycle stage
- [ ] `tags` enable discovery and filtering
