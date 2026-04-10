# Example Agents

This directory contains four example `*.agent.ts` files that demonstrate Archon's `defineAgent()` API. Together they form a complete **Episode Processing Pipeline** -- from raw audio transcription to AI-generated thumbnails.

## Running the examples

The included `archon.config.ts` at the project root is already configured to scan this directory:

```typescript
include: ['examples/**/*.agent.ts']
```

Start the viewer:

```bash
pnpm dev
```

Open [http://localhost:6006](http://localhost:6006) to see all four agents in the catalog. Navigate to the "Episode Processing Pipeline" to see them rendered as a DAG graph.

---

## Agents

### 1. `transcript-parsing.agent.ts` -- Transcript Parser

**What it demonstrates:**
- A **non-AI agent** (pure data transformation, no model call)
- Setting `config.maxTokens: 0` to signal that no model is invoked
- Defining typed `input` and `output` with Zod schemas and realistic examples
- Using `feeds` to declare downstream consumers

**What it does:**
Parses raw Whisper API output into structured data with full text, timestamped text, segment count, and word count. This is the entry point of the pipeline.

**Key patterns:**
- No `model` or `provider` field (not an AI agent)
- `feeds: ['hook-detection', 'gpt-analysis']` declares that two agents consume its output

**Use as a starting point when:** You have a data transformation step that does not call an LLM but needs to be visible in the agent catalog.

---

### 2. `hook-detection.agent.ts` -- Hook Detection

**What it demonstrates:**
- An **AI agent with structured prompts** using XML tags
- Using `reasoning: { effort: 'low' }` for fast extraction
- A rich `output` schema with enums and nested objects
- `dependsOn` and `feeds` for pipeline positioning
- A system prompt structured with `<role>`, `<task>`, and `<hook_type_definitions>` tags

**What it does:**
Analyzes a transcript and extracts high-retention viral hooks (revelations, controversies, bold claims, questions, emotional moments). Each hook gets a viral strength score from 1 to 10.

**Key patterns:**
- `dependsOn: ['transcript-parsing']` positions it after the parser in the pipeline graph
- `feeds: ['gpt-analysis']` passes hooks to the deep analysis agent
- Low temperature (`0.3`) for consistent extraction
- XML-tagged prompt for clear instruction boundaries

**Use as a starting point when:** You need a focused extraction/classification agent with structured output.

---

### 3. `gpt-analysis.agent.ts` -- GPT Deep Analysis

**What it demonstrates:**
- A **multi-step AI agent** (2-call pipeline with Chain of Thought)
- **Multiple dependencies** (`dependsOn: ['transcript-parsing', 'hook-detection']`)
- **Multiple downstream consumers** (`feeds: ['thumbnail-pipeline', 'trend-titles', 'viral-clips']`)
- A complex output schema with nested objects, arrays, and optional fields
- Including **metrics** for observability

**What it does:**
Performs deep podcast analysis in two GPT calls. Call 1 uses medium reasoning effort for deep analysis. Call 2 formats the results into structured metadata: guest info, chapters, titles, tags, and descriptions.

**Key patterns:**
- `reasoning: { effort: 'medium' }` balances quality and speed
- Higher token limits (`maxTokens: 8000`) for detailed analysis
- `metrics` field shows real performance data
- This agent is the **hub** of the pipeline -- it receives from two agents and feeds three

**Use as a starting point when:** You have a complex analysis agent that synthesizes multiple inputs and produces rich structured output.

---

### 4. `thumbnail-pipeline.agent.ts` -- Thumbnail Pipeline

**What it demonstrates:**
- A **multi-modal agent** using image generation (Gemini)
- **Tool usage** with string references (`['gemini-image-generation', 'background-removal']`)
- A different `provider` (`google`) than the other agents
- Higher temperature (`0.8`) for creative output
- A domain-specific prompt with strict safety rules (`<face_preservation_rules>`)

**What it does:**
Takes chapter context from GPT analysis and generates viral YouTube thumbnails. Preserves faces, applies cinematic backgrounds, and adds high-impact text overlays.

**Key patterns:**
- `dependsOn: ['gpt-analysis']` positions it at the end of the main pipeline
- `tools` lists external capabilities the agent invokes
- The prompt contains **hard safety rules** (face preservation) alongside creative instructions
- `metrics` track both quality (`successRate: 0.91`) and cost

**Use as a starting point when:** You need an image/media generation agent with external tool dependencies.

---

## Pipeline Flow

```
transcript-parsing  (Layer 0)
       |
       v
  hook-detection    (Layer 1)
       |
       v
  gpt-analysis      (Layer 2)  <-- also depends on transcript-parsing
       |
       v
thumbnail-pipeline  (Layer 3)
```

The pipeline graph in Archon renders this automatically from the `dependsOn` relationships. No manual layout needed.

---

## Adding Your Own Examples

1. Create a new file: `examples/my-agent.agent.ts`
2. Import and call `defineAgent`:

```typescript
import { defineAgent } from '../src/index.js';

export default defineAgent({
  id: 'my-agent',
  name: 'My Agent',
  description: 'What it does.',
  // ... see docs/schema-guide.md for all fields
});
```

3. Restart `pnpm dev` -- the new agent appears in the catalog automatically.

To add it to a pipeline, update `archon.config.ts`:

```typescript
pipelines: [
  {
    id: 'my-pipeline',
    name: 'My Pipeline',
    stages: ['my-agent', ...],
  },
],
```

---

## Further Reading

- [Schema Guide](../docs/schema-guide.md) -- Full reference for every `defineAgent()` field
- [Best Practices](../docs/best-practices.md) -- Patterns for guardrails, prompts, errors, tools, and more
- [README](../README.md) -- Project overview and quick start
