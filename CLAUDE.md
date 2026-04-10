# Archon — The Storybook for AI Agents

npm package: `agent-archon` | Port: :6006 | Next.js 16.2 + Turbopack + shadcn/ui

## Quick Reference
- `npm run dev` — dev server with mock data on :6006
- `npx tsx src/cli/index.ts lint` — lint all agents (24 checks, exit code 1 on critical)
- `npx tsx src/cli/index.ts lint --strict` — fail on warnings too (CI mode)
- `npx tsx src/cli/index.ts build` — standalone deployable output
- `npx tsx src/cli/index.ts init` — scaffold config + example in a new project

## Structure
```
src/
  app/              — Next.js App Router (6 pages, 9 API routes)
  components/       — UI (catalog, detail, pipeline, immersive, telemetry, layout)
  schema/           — Zod schemas (agent.ts: 13 sub-schemas, pipeline.ts, config.ts)
  scanner/          — Agent discovery (file, markdown, framework detector, registry)
  lib/              — Core logic (analyzer, registry singleton, telemetry, utils)
  mocks/            — Mock data (15 agents, 2 pipelines)
  cli/              — CLI commands (dev, init, build, lint, prebake)
  hooks/            — React hooks
examples/           — Example .agent.ts files
docs/               — Schema guide + best practices
public/             — Logo SVGs
```

## Key Files
- `src/schema/agent.ts` — THE core: AgentDefinition with 118 Zod fields
- `src/lib/analyzer.ts` — Best practices engine (24 checks, health score)
- `src/scanner/frameworkDetector.ts` — Auto-detects OpenAI/Anthropic/Vercel AI/LangChain agents
- `src/components/detail/AgentDetail.tsx` — 9-tab agent detail (Schema, Prompt, Config, Deps, Health, Playground, Stories, Compare, Edit)
- `src/mocks/agents.ts` — Mock agents with stories, guardrails, evaluations

## Agent Detail Tabs
1. **Schema** — Input/output schemas with JSON examples
2. **Prompt** — Full system prompt display
3. **Config** — Model, temperature, tokens, reasoning, retry strategy
4. **Dependencies** — dependsOn/feeds graph links
5. **Health** — 24 best-practice checks with score 0-100
6. **Playground** — Real API calls (OpenAI/Anthropic/Google) or mock fallback
7. **Stories** — Predefined test scenarios with assertions (run against API)
8. **Compare** — A/B prompt testing with diff view + cost estimation
9. **Edit** — Modify agent files from the UI (dev mode only)

## Design System
- Dark mode default (OKLCH tokens in globals.css)
- Glassmorphism: `glass`, `glass-highlight`, `glass-interactive`
- shadcn/ui base-nova with 24 components
- Provider accent colors: openai=#22c55e, anthropic=#a855f7, google=#3b82f6
- Animations: fade-in-up, slide-in-left, immersive-enter, shimmer

## Known Gotchas
- Don't use `ScrollArea` with `max-h-*` — use `overflow-y-auto scrollbar-hide`
- Don't use `useSearchParams()` — pass from server component via props
- Button with `render={<Link>}` needs `nativeButton={false}`
- Three.js components must use `dynamic()` with `ssr: false`
- Scanner runs in tsx subprocess, not Next.js bundler
- Production reads from `.archon-data.json` (baked at build time)

## Agents
Specialized agents in `.claude/agents/`:
- **ui-designer** — shadcn components, glassmorphism, animations
- **schema-architect** — AgentDefinition schema evolution
- **scanner-builder** — Framework detection, agent discovery
- **analyzer-engine** — Best-practices checks, health scoring
- **three-scene** — Three.js immersive visualization

## Skills
- `/lint-check` — Run archon lint and report
- `/audit` — Full project health audit
