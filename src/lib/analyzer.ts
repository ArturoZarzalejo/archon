/**
 * Best Practices Analyzer for Agent Definitions.
 *
 * Static analysis engine that inspects an agent definition and returns
 * actionable recommendations sorted by severity. This is the core
 * differentiator — no other tool does this.
 */

// ============================================================================
// Types
// ============================================================================

export interface Recommendation {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'tip';
  category:
    | 'security'
    | 'reliability'
    | 'performance'
    | 'quality'
    | 'observability'
    | 'documentation';
  title: string;
  description: string;
  fix?: string;
}

// ============================================================================
// Severity ordering (lower = higher priority)
// ============================================================================

const SEVERITY_ORDER: Record<Recommendation['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
  tip: 3,
};

// ============================================================================
// Helpers
// ============================================================================

function has(obj: Record<string, unknown>, key: string): boolean {
  return obj[key] != null;
}

function deepGet(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

function isNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function usesExternalAPIs(agent: Record<string, unknown>): boolean {
  return has(agent, 'model') || isNonEmptyArray(agent.tools);
}

// ============================================================================
// Check definitions
// ============================================================================

type Check = (agent: Record<string, unknown>) => Recommendation | null;

const checks: Check[] = [
  // ── Security ─────────────────────────────────────────────────────────

  (agent) => {
    if (!has(agent, 'model')) return null;
    const secrets = agent.secrets;
    if (isNonEmptyArray(secrets)) return null;
    return {
      id: 'no-secrets-declared',
      severity: 'critical',
      category: 'security',
      title: 'No secrets declared',
      description:
        'This agent uses a model but does not declare required API keys in the secrets field. Undeclared secrets can leak or be misconfigured in deployment.',
      fix: 'Add a `secrets` array listing required environment variables, e.g. `secrets: ["OPENAI_API_KEY"]`.',
    };
  },

  (agent) => {
    if (!has(agent, 'input') && !has(agent, 'output')) return null;
    if (isNonEmptyArray(agent.guardrails)) return null;
    return {
      id: 'no-guardrails',
      severity: 'critical',
      category: 'security',
      title: 'No guardrails defined',
      description:
        'This agent has input/output but no guardrails to validate data. Without guardrails, malformed or malicious input can cause unexpected behavior.',
      fix: 'Add a `guardrails` array with at least one input validator and one output validator.',
    };
  },

  // ── Reliability ──────────────────────────────────────────────────────

  (agent) => {
    if (!usesExternalAPIs(agent)) return null;
    if (deepGet(agent, 'config.maxRetries') != null) return null;
    return {
      id: 'no-retry-strategy',
      severity: 'warning',
      category: 'reliability',
      title: 'No retry strategy',
      description:
        'This agent calls external APIs but has no retry strategy configured. Transient failures (rate limits, timeouts) will cause immediate failures.',
      fix: 'Add `config.maxRetries` (e.g. 3) and `config.retryBackoff: "exponential"` for resilient API calls.',
    };
  },

  (agent) => {
    if (deepGet(agent, 'runtime.timeout') != null) return null;
    return {
      id: 'no-timeout',
      severity: 'warning',
      category: 'reliability',
      title: 'No execution timeout',
      description:
        'No timeout is set for this agent. A hanging execution can block resources indefinitely and increase costs.',
      fix: 'Add `runtime: { timeout: 30000 }` (in milliseconds) appropriate for your workload.',
    };
  },

  (agent) => {
    if (isNonEmptyArray(agent.errors)) return null;
    return {
      id: 'no-error-handling',
      severity: 'warning',
      category: 'reliability',
      title: 'No error handling declared',
      description:
        'This agent does not declare expected failure modes. Without explicit error definitions, failures are harder to diagnose and recover from.',
      fix: 'Add an `errors` array declaring expected failure modes, e.g. `{ code: "RATE_LIMITED", description: "...", recoverable: true }`.',
    };
  },

  (agent) => {
    if (!isNonEmptyArray(agent.dependsOn)) return null;
    if (isNonEmptyArray(agent.handoffs)) return null;
    // Check for fallback in config or errors
    const errors = agent.errors as Array<Record<string, unknown>> | undefined;
    const hasFallbackError = errors?.some((e) => e.retryStrategy && e.retryStrategy !== 'none');
    if (hasFallbackError) return null;
    return {
      id: 'no-fallback',
      severity: 'info',
      category: 'reliability',
      title: 'No fallback for upstream dependencies',
      description:
        'This agent depends on other agents but has no fallback strategy if they fail. Consider what happens when an upstream agent is unavailable.',
      fix: 'Add `handoffs` with fallback targets or define error entries with `retryStrategy` for graceful degradation.',
    };
  },

  // ── Performance ──────────────────────────────────────────────────────

  (agent) => {
    if (!has(agent, 'config')) return null;
    if (deepGet(agent, 'config.caching') != null) return null;
    return {
      id: 'no-caching',
      severity: 'tip',
      category: 'performance',
      title: 'Caching not configured',
      description:
        'This agent has a config but caching is not explicitly set. For deterministic operations, caching can significantly reduce latency and cost.',
      fix: 'Add `config.caching: true` and optionally `config.cacheTtl` for time-bound caching.',
    };
  },

  (agent) => {
    const temp = deepGet(agent, 'config.temperature');
    if (typeof temp !== 'number' || temp <= 1.0) return null;
    return {
      id: 'high-temperature',
      severity: 'warning',
      category: 'performance',
      title: 'High temperature setting',
      description: `Temperature is set to ${temp}. Values above 1.0 increase output variance and reduce predictability. This is usually undesirable in production.`,
      fix: 'Lower `config.temperature` to 0.3-0.7 for production use. Reserve high values for creative brainstorming only.',
    };
  },

  (agent) => {
    const tokens = deepGet(agent, 'config.maxTokens');
    if (typeof tokens !== 'number' || tokens <= 16000) return null;
    return {
      id: 'excessive-tokens',
      severity: 'info',
      category: 'performance',
      title: 'Excessive maxTokens',
      description: `maxTokens is set to ${tokens}. High token limits increase cost and latency. Most tasks can be completed with fewer tokens.`,
      fix: 'Review output requirements and reduce `config.maxTokens` to the minimum needed. Consider splitting into multiple calls if output is genuinely large.',
    };
  },

  (agent) => {
    if (!usesExternalAPIs(agent)) return null;
    if (deepGet(agent, 'config.rateLimit') != null) return null;
    return {
      id: 'no-rate-limit',
      severity: 'info',
      category: 'performance',
      title: 'No rate limit configured',
      description:
        'This agent calls external APIs but has no rate limit configured. Burst traffic can trigger API throttling and cascading failures.',
      fix: 'Add `config.rateLimit` (requests per minute) to prevent API throttling.',
    };
  },

  // ── Quality ──────────────────────────────────────────────────────────

  (agent) => {
    if (!has(agent, 'model')) return null;
    if (isNonEmptyString(agent.prompt)) return null;
    return {
      id: 'no-prompt',
      severity: 'critical',
      category: 'quality',
      title: 'No system prompt defined',
      description:
        'This agent uses a model but has no system prompt. Without a prompt, the model has no guidance on role, task, or output format.',
      fix: 'Define a `prompt` with role definition, task description, output format, and constraints.',
    };
  },

  (agent) => {
    if (!isNonEmptyString(agent.prompt)) return null;
    if ((agent.prompt as string).length >= 100) return null;
    return {
      id: 'short-prompt',
      severity: 'warning',
      category: 'quality',
      title: 'System prompt is very short',
      description:
        'The system prompt is under 100 characters. Short prompts typically lack the specificity needed for consistent, high-quality output.',
      fix: 'Expand the prompt with: role definition, detailed task description, output format specification, edge case handling, and examples.',
    };
  },

  (agent) => {
    const outputSchema = deepGet(agent, 'output.schema');
    if (outputSchema != null) return null;
    return {
      id: 'no-output-schema',
      severity: 'info',
      category: 'quality',
      title: 'No output schema defined',
      description:
        'This agent has no output schema for validation. Without a schema, output format can drift and downstream consumers may break.',
      fix: 'Add `output.schema` using Zod or JSON Schema to validate output structure at runtime.',
    };
  },

  (agent) => {
    if (!has(agent, 'input') && !has(agent, 'output')) return null;
    const inputExample = deepGet(agent, 'input.example');
    const outputExample = deepGet(agent, 'output.example');
    if (inputExample != null || outputExample != null) return null;
    return {
      id: 'no-examples',
      severity: 'tip',
      category: 'quality',
      title: 'No example data provided',
      description:
        'This agent has input/output definitions but no example data. Examples serve as documentation and enable automated testing.',
      fix: 'Add `example` fields to both `input` and `output` with realistic sample data.',
    };
  },

  (agent) => {
    if (isNonEmptyArray(agent.evaluations)) return null;
    return {
      id: 'no-evaluations',
      severity: 'tip',
      category: 'quality',
      title: 'No evaluations recorded',
      description:
        'This agent has no evaluation results. Without evaluations, there is no evidence of quality or regression tracking.',
      fix: 'Run evaluations against test datasets and record results in the `evaluations` array with scores and dates.',
    };
  },

  // ── Observability ────────────────────────────────────────────────────

  (agent) => {
    if (has(agent, 'metrics')) return null;
    return {
      id: 'no-metrics',
      severity: 'warning',
      category: 'observability',
      title: 'No metrics tracked',
      description:
        'This agent has no metrics defined. Without observability data, you cannot measure performance, detect regressions, or optimize costs.',
      fix: 'Add a `metrics` object tracking at minimum: `successRate`, `avgLatencyMs`, and `estimatedCostPer1k`.',
    };
  },

  (agent) => {
    const tags = agent.tags;
    if (isNonEmptyArray(tags)) return null;
    return {
      id: 'no-tags',
      severity: 'tip',
      category: 'observability',
      title: 'No tags assigned',
      description:
        'This agent has no tags. Tags enable filtering, grouping, and quick discovery across large agent catalogs.',
      fix: 'Add a `tags` array with descriptive keywords, e.g. `["transcription", "audio", "whisper"]`.',
    };
  },

  (agent) => {
    if (!has(agent, 'metrics')) return null;
    const metrics = agent.metrics as Record<string, unknown>;
    if (metrics.successRate != null) return null;
    return {
      id: 'missing-success-rate',
      severity: 'info',
      category: 'observability',
      title: 'Missing success rate metric',
      description:
        'This agent tracks metrics but not success rate — the single most important metric for agent reliability.',
      fix: 'Add `metrics.successRate` (0.0-1.0) to track what percentage of executions complete successfully.',
    };
  },

  // ── Documentation ────────────────────────────────────────────────────

  (agent) => {
    const desc = agent.description;
    if (typeof desc === 'string' && desc.trim().length >= 20) return null;
    return {
      id: 'no-description',
      severity: 'warning',
      category: 'documentation',
      title: 'Missing or insufficient description',
      description:
        'This agent has no description or it is too short. A clear description is essential for discoverability and understanding.',
      fix: 'Write a description of at least 20 characters explaining what this agent does, its inputs, and its purpose.',
    };
  },

  (agent) => {
    if (isNonEmptyString(agent.version)) return null;
    return {
      id: 'no-version',
      severity: 'info',
      category: 'documentation',
      title: 'No version specified',
      description:
        'This agent has no version. Without versioning, it is impossible to track changes, rollback safely, or communicate breaking changes.',
      fix: 'Add a `version` field using semantic versioning, e.g. `"1.0.0"`.',
    };
  },

  (agent) => {
    if (isNonEmptyString(agent.author)) return null;
    return {
      id: 'no-author',
      severity: 'tip',
      category: 'documentation',
      title: 'No author declared',
      description:
        'This agent has no author. Authorship is important for accountability, code review routing, and support escalation.',
      fix: 'Add an `author` field, e.g. `"vision-team"` or `"jane.doe"`.',
    };
  },

  (agent) => {
    const id = agent.id as string | undefined;
    if (!id) return null;
    const genericPatterns = ['agent', 'test', 'temp', 'demo', 'untitled', 'new-agent', 'my-agent'];
    const lower = id.toLowerCase();
    const isGeneric = genericPatterns.some(
      (pattern) => lower === pattern || lower.startsWith(`${pattern}-`) || lower.endsWith(`-${pattern}`),
    );
    if (!isGeneric) return null;
    return {
      id: 'generic-id',
      severity: 'tip',
      category: 'documentation',
      title: 'Generic agent ID',
      description: `The ID "${id}" is too generic. Descriptive IDs make agents easier to find and reference in pipelines.`,
      fix: 'Use a descriptive, specific ID that reflects the agent\'s function, e.g. `"transcript-parser"` instead of `"agent-1"`.',
    };
  },

  (agent) => {
    if (isNonEmptyString(agent.module)) return null;
    return {
      id: 'no-module',
      severity: 'tip',
      category: 'documentation',
      title: 'No module assigned',
      description:
        'This agent is not assigned to a module. Modules provide organizational grouping and help understand system architecture.',
      fix: 'Add a `module` field, e.g. `"episodes"`, `"services"`, or `"analytics"`.',
    };
  },
];

// ============================================================================
// Main analyzer
// ============================================================================

export function analyzeAgent(agent: Record<string, unknown>): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const check of checks) {
    const result = check(agent);
    if (result) recommendations.push(result);
  }

  // Sort by severity: critical first, then warning, info, tip
  recommendations.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return recommendations;
}

// ============================================================================
// Health score calculation
// ============================================================================

export function calculateHealthScore(recommendations: Recommendation[]): number {
  const total = recommendations.length;
  if (total === 0) return 100;

  const criticalCount = recommendations.filter((r) => r.severity === 'critical').length;
  const warningCount = recommendations.filter((r) => r.severity === 'warning').length;

  const penalty = criticalCount * 3 + warningCount * 1;
  const score = ((total - penalty) / total) * 100;

  return Math.round(Math.max(0, Math.min(100, score)));
}
