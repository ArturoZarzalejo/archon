import { z } from 'zod';

// ============================================================================
// Agent I/O Schema
// ============================================================================

const AgentIOSchemaZ = z.object({
  description: z.string().optional(),
  schema: z.any().optional(),
  example: z.any().optional(),
});

export type AgentIOSchema = z.infer<typeof AgentIOSchemaZ>;

// ============================================================================
// Tool Definition
// ============================================================================

const ToolDefinitionZ = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.any().optional(),
  outputSchema: z.any().optional(),
  mcpServer: z.string().optional(),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionZ>;

// ============================================================================
// Guardrail Definition
// ============================================================================

const GuardrailZ = z.object({
  name: z.string(),
  type: z.enum(['input', 'output', 'both']),
  description: z.string().optional(),
  validator: z.string().optional(),
  failAction: z.enum(['block', 'warn', 'fallback']).default('block'),
});

export type Guardrail = z.infer<typeof GuardrailZ>;

// ============================================================================
// Handoff Definition
// ============================================================================

const HandoffZ = z.object({
  targetAgentId: z.string(),
  condition: z.string().optional(),
  transferData: z.boolean().default(true),
});

export type Handoff = z.infer<typeof HandoffZ>;

// ============================================================================
// Agent Error Definition
// ============================================================================

const AgentErrorZ = z.object({
  code: z.string(),
  description: z.string(),
  recoverable: z.boolean().default(false),
  retryStrategy: z.enum(['none', 'immediate', 'exponential']).optional(),
});

export type AgentError = z.infer<typeof AgentErrorZ>;

// ============================================================================
// Evaluation Result
// ============================================================================

const EvaluationZ = z.object({
  dataset: z.string().optional(),
  date: z.string().optional(),
  scores: z.record(z.number()).optional(),
  notes: z.string().optional(),
});

export type Evaluation = z.infer<typeof EvaluationZ>;

// ============================================================================
// Hook Definition
// ============================================================================

const AgentHookZ = z.object({
  event: z.enum([
    'beforeRun',
    'afterRun',
    'onError',
    'onRetry',
    'onHandoff',
    'onToolCall',
  ]),
  handler: z.string().optional(),
  description: z.string().optional(),
});

export type AgentHook = z.infer<typeof AgentHookZ>;

// ============================================================================
// Runtime Requirements
// ============================================================================

const RuntimeZ = z.object({
  memory: z.string().optional(),
  gpu: z.boolean().default(false),
  timeout: z.number().optional(),
  concurrency: z.number().optional(),
});

export type Runtime = z.infer<typeof RuntimeZ>;

// ============================================================================
// SLA
// ============================================================================

const SlaZ = z.object({
  targetUptime: z.number().min(0).max(1).optional(),
  maxLatencyMs: z.number().optional(),
  maxCostPerCall: z.number().optional(),
});

export type Sla = z.infer<typeof SlaZ>;

// ============================================================================
// Agent Metrics
// ============================================================================

const AgentMetricsZ = z.object({
  // Core performance
  avgTokensIn: z.number().optional(),
  avgTokensOut: z.number().optional(),
  avgLatencyMs: z.number().optional(),
  estimatedCostPer1k: z.number().optional(),
  successRate: z.number().min(0).max(1).optional(),
  lastRun: z.string().optional(),

  // Quality & reliability
  hallucinationRate: z.number().min(0).max(1).optional(),
  toolAccuracy: z.number().min(0).max(1).optional(),
  guardrailTriggerRate: z.number().min(0).max(1).optional(),
  avgRetryCount: z.number().optional(),
  totalRuns: z.number().optional(),

  // Cost breakdown
  inputCostPer1k: z.number().optional(),
  outputCostPer1k: z.number().optional(),
});

export type AgentMetrics = z.infer<typeof AgentMetricsZ>;

// ============================================================================
// Agent Config
// ============================================================================

const AgentConfigZ = z.object({
  // Model tuning
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
  reasoning: z.object({
    effort: z.enum(['low', 'medium', 'high']),
  }).optional(),
  caching: z.boolean().optional(),

  // Retry & resilience
  maxRetries: z.number().optional(),
  retryBackoff: z.enum(['none', 'linear', 'exponential']).optional(),
  retryableErrors: z.array(z.string()).optional(),

  // Rate limiting & streaming
  rateLimit: z.number().optional(),
  streaming: z.boolean().optional(),

  // Cache
  cacheTtl: z.number().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigZ>;

// ============================================================================
// Agent Story (test scenario)
// ============================================================================

const AgentStoryZ = z.object({
  name: z.string(),
  description: z.string().optional(),
  input: z.any(),                        // The test input
  expectedOutput: z.any().optional(),     // What we expect back (for comparison)
  assertions: z.array(z.object({
    field: z.string(),                    // JSONPath-like field to check (e.g. "hooks.length", "hooks[0].strength")
    operator: z.enum(['equals', 'gt', 'lt', 'gte', 'lte', 'contains', 'exists', 'type']),
    value: z.any(),
  })).optional(),
  tags: z.array(z.string()).optional(),   // e.g. ['happy-path', 'edge-case', 'stress']
});

export type AgentStory = z.infer<typeof AgentStoryZ>;

// ============================================================================
// Agent Definition
// ============================================================================

export const AgentDefinitionSchema = z.object({
  // ── Identity ────────────────────────────────────────────────────────
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().default('1.0.0'),
  module: z.string().optional(),

  // ── Model ───────────────────────────────────────────────────────────
  model: z.string().optional(),
  provider: z.enum(['openai', 'anthropic', 'google', 'custom']).optional(),
  config: AgentConfigZ.optional(),

  // ── I/O ─────────────────────────────────────────────────────────────
  input: AgentIOSchemaZ.optional(),
  output: AgentIOSchemaZ.optional(),

  // ── Prompt ──────────────────────────────────────────────────────────
  prompt: z.string().optional(),

  // ── Graph ───────────────────────────────────────────────────────────
  dependsOn: z.array(z.string()).optional(),
  feeds: z.array(z.string()).optional(),
  tools: z.array(z.union([z.string(), ToolDefinitionZ])).optional(),
  handoffs: z.array(HandoffZ).optional(),

  // ── Guardrails & Safety ─────────────────────────────────────────────
  guardrails: z.array(GuardrailZ).optional(),

  // ── Error Handling ──────────────────────────────────────────────────
  errors: z.array(AgentErrorZ).optional(),

  // ── Lifecycle Hooks ─────────────────────────────────────────────────
  hooks: z.array(AgentHookZ).optional(),

  // ── Evaluations ─────────────────────────────────────────────────────
  evaluations: z.array(EvaluationZ).optional(),

  // ── Runtime Requirements ────────────────────────────────────────────
  runtime: RuntimeZ.optional(),

  // ── SLA ─────────────────────────────────────────────────────────────
  sla: SlaZ.optional(),

  // ── Secrets & Capabilities ──────────────────────────────────────────
  secrets: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),

  // ── Stories (test scenarios) ─────────────────────────────────────────
  stories: z.array(AgentStoryZ).optional(),

  // ── Metadata ────────────────────────────────────────────────────────
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  status: z.enum(['active', 'deprecated', 'experimental', 'legacy']).default('active'),
  metrics: AgentMetricsZ.optional(),
  sunsetsAt: z.string().optional(),

  // ── Populated by scanner ────────────────────────────────────────────
  sourceFile: z.string().optional(),
  documentationFile: z.string().optional(),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

export function defineAgent(config: AgentDefinition): AgentDefinition {
  return AgentDefinitionSchema.parse(config);
}
