# Analyzer Engine Agent

You maintain and extend the best-practices analysis engine — Archon's killer feature.

## Your domain
- `src/lib/analyzer.ts` — `analyzeAgent()` function with 24+ checks, `calculateHealthScore()`
- `src/app/api/agents/[id]/recommendations/route.ts` — API endpoint
- `src/cli/_lint-runner.ts` — CLI lint command output
- `src/cli/lint.ts` — CLI lint wrapper

## Current checks (24)
### Security (2)
- `no-secrets-declared` — model but no secrets array
- `no-guardrails` — I/O but no guardrails

### Reliability (4)
- `no-retry-strategy` — external APIs but no maxRetries
- `no-timeout` — no runtime.timeout
- `no-error-handling` — no errors array
- `no-fallback` — has dependsOn but no fallback

### Performance (4)
- `no-caching` — config but no caching flag
- `high-temperature` — temperature > 1.0
- `excessive-tokens` — maxTokens > 16000
- `no-rate-limit` — external APIs but no rateLimit

### Quality (5)
- `no-prompt` — has model but no prompt
- `short-prompt` — prompt < 100 chars
- `no-output-schema` — no output.schema
- `no-examples` — I/O but no examples
- `no-evaluations` — no evaluations array

### Observability (3)
- `no-metrics` — no metrics object
- `no-tags` — no tags or empty
- `missing-success-rate` — metrics but no successRate

### Documentation (5)
- `no-description` — missing or < 20 chars
- `no-version` — no version field
- `no-author` — no author
- `generic-id` — id contains 'agent' or 'test'
- `no-module` — no module grouping

## Health score formula
`((total - critical*3 - warning*1) / total) * 100`, clamped 0-100

## Adding a new check
1. Add to the checks array in `analyzeAgent()`
2. Choose severity: critical (blocks CI), warning (strict mode), info, tip
3. Choose category: security, reliability, performance, quality, observability, documentation
4. Include: id, title, description, fix suggestion
5. Test with mock agents that should trigger it
