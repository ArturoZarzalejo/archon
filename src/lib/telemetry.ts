/**
 * Archon Telemetry — Anonymous, opt-in data collection.
 *
 * Collects ONLY structural patterns, NEVER content:
 * - How many agents per project
 * - Which models/providers are used
 * - Average agent complexity (fields populated)
 * - Common pipeline patterns (stage counts)
 * - Schema usage (which optional fields are adopted)
 *
 * NEVER collects: prompts, examples, secrets, API keys, source paths, descriptions
 */

import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

import type { AgentRegistry } from '@/scanner/registry';
import type { AgentDefinition } from '@/schema/agent';
import { loadConfig } from '@/scanner/configLoader';

// ============================================================================
// Types
// ============================================================================

export interface TelemetryEvent {
  type: 'scan_complete';
  timestamp: string;
  projectHash: string;
  archonVersion: string;
  data: ScanTelemetry;
}

export interface ScanTelemetry {
  // Agent counts
  totalAgents: number;
  agentsByStatus: Record<string, number>;
  agentsByProvider: Record<string, number>;
  agentsByModule: Record<string, number>;
  legacyAgents: number;

  // Schema adoption (count of agents using each optional field)
  schemaAdoption: {
    hasPrompt: number;
    hasInputSchema: number;
    hasOutputSchema: number;
    hasExamples: number;
    hasTools: number;
    hasGuardrails: number;
    hasHandoffs: number;
    hasErrors: number;
    hasHooks: number;
    hasRuntime: number;
    hasSla: number;
    hasSecrets: number;
    hasMetrics: number;
    hasEvaluations: number;
  };

  // Pipeline info
  totalPipelines: number;
  avgStagesPerPipeline: number;

  // Models used (just model names, no configs)
  modelsUsed: string[];
}

// ============================================================================
// Collect telemetry from registry
// ============================================================================

export function collectTelemetry(registry: AgentRegistry): TelemetryEvent {
  const agents = registry.getAll();
  const pipelines = registry.getPipelines();

  const projectRoot = process.env.ARCHON_PROJECT_ROOT || process.cwd();
  const projectHash = createHash('sha256').update(projectRoot).digest('hex');

  // Count agents by status
  const agentsByStatus: Record<string, number> = {};
  for (const agent of agents) {
    const status = agent.status ?? 'active';
    agentsByStatus[status] = (agentsByStatus[status] ?? 0) + 1;
  }

  // Count agents by provider
  const agentsByProvider: Record<string, number> = {};
  for (const agent of agents) {
    const provider = agent.provider ?? 'unknown';
    agentsByProvider[provider] = (agentsByProvider[provider] ?? 0) + 1;
  }

  // Count agents by module
  const agentsByModule: Record<string, number> = {};
  for (const agent of agents) {
    const mod = agent.module ?? 'uncategorized';
    agentsByModule[mod] = (agentsByModule[mod] ?? 0) + 1;
  }

  // Legacy agents (those with status 'legacy')
  const legacyAgents = agentsByStatus['legacy'] ?? 0;

  // Schema adoption
  const schemaAdoption = {
    hasPrompt: countWith(agents, (a) => !!a.prompt),
    hasInputSchema: countWith(agents, (a) => !!a.input),
    hasOutputSchema: countWith(agents, (a) => !!a.output),
    hasExamples: countWith(
      agents,
      (a) => !!a.input?.example || !!a.output?.example,
    ),
    hasTools: countWith(agents, (a) => !!a.tools && a.tools.length > 0),
    hasGuardrails: countWith(
      agents,
      (a) => !!a.guardrails && a.guardrails.length > 0,
    ),
    hasHandoffs: countWith(
      agents,
      (a) => !!a.handoffs && a.handoffs.length > 0,
    ),
    hasErrors: countWith(agents, (a) => !!a.errors && a.errors.length > 0),
    hasHooks: countWith(agents, (a) => !!a.hooks && a.hooks.length > 0),
    hasRuntime: countWith(agents, (a) => !!a.runtime),
    hasSla: countWith(agents, (a) => !!a.sla),
    hasSecrets: countWith(agents, (a) => !!a.secrets && a.secrets.length > 0),
    hasMetrics: countWith(agents, (a) => !!a.metrics),
    hasEvaluations: countWith(
      agents,
      (a) => !!a.evaluations && a.evaluations.length > 0,
    ),
  };

  // Pipeline stats
  const totalPipelines = pipelines.length;
  const avgStagesPerPipeline =
    totalPipelines > 0
      ? pipelines.reduce((sum, p) => sum + p.stages.length, 0) / totalPipelines
      : 0;

  // Unique models
  const modelsUsed = [
    ...new Set(agents.map((a) => a.model).filter(Boolean) as string[]),
  ];

  return {
    type: 'scan_complete',
    timestamp: new Date().toISOString(),
    projectHash,
    archonVersion: '0.1.0',
    data: {
      totalAgents: agents.length,
      agentsByStatus,
      agentsByProvider,
      agentsByModule,
      legacyAgents,
      schemaAdoption,
      totalPipelines,
      avgStagesPerPipeline: Math.round(avgStagesPerPipeline * 100) / 100,
      modelsUsed,
    },
  };
}

// ============================================================================
// Send telemetry (local file + optional remote endpoint)
// ============================================================================

export async function sendTelemetry(
  event: TelemetryEvent,
  endpoint?: string,
): Promise<void> {
  // Log to console
  console.log(
    '[archon:telemetry] Scan complete —',
    event.data.totalAgents,
    'agents,',
    event.data.totalPipelines,
    'pipelines,',
    event.data.modelsUsed.length,
    'models',
  );
  console.log('[archon:telemetry]', JSON.stringify(event.data, null, 2));

  // Save to local file (always — serves as fallback)
  const projectRoot = process.env.ARCHON_PROJECT_ROOT || process.cwd();
  const archonDir = path.join(projectRoot, '.archon');

  try {
    await mkdir(archonDir, { recursive: true });
    await writeFile(
      path.join(archonDir, 'telemetry.json'),
      JSON.stringify(event, null, 2),
      'utf-8',
    );
    console.log('[archon:telemetry] Saved to .archon/telemetry.json');
  } catch (err) {
    console.warn('[archon:telemetry] Failed to save telemetry file:', err);
  }

  // Remote endpoint — resolve from argument, config, or env var
  const remoteUrl = endpoint ?? await resolveEndpoint();

  if (remoteUrl) {
    // Fire and forget — don't block the caller
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(remoteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller.signal,
    })
      .then(() => {
        clearTimeout(timeout);
        console.log('[archon:telemetry] Sent to', remoteUrl);
      })
      .catch(() => {
        clearTimeout(timeout);
        // Silently swallow — telemetry must never break the host app
      });
  }
}

// ============================================================================
// Resolve remote endpoint URL from config or env
// ============================================================================

async function resolveEndpoint(): Promise<string | undefined> {
  // 1. Environment variable takes priority
  const envUrl = process.env.ARCHON_TELEMETRY_ENDPOINT;
  if (envUrl) return envUrl;

  // 2. Fall back to config file
  try {
    const projectRoot = process.env.ARCHON_PROJECT_ROOT || process.cwd();
    const config = await loadConfig(projectRoot);
    return config.telemetry?.endpoint;
  } catch {
    return undefined;
  }
}

// ============================================================================
// Check if telemetry is enabled
// ============================================================================

export async function isTelemetryEnabled(): Promise<boolean> {
  // Check env var — if explicitly disabled, bail
  if (process.env.ARCHON_TELEMETRY === 'false') {
    return false;
  }

  // Check config
  try {
    const projectRoot = process.env.ARCHON_PROJECT_ROOT || process.cwd();
    const config = await loadConfig(projectRoot);
    return config.telemetry?.enabled === true;
  } catch {
    return false;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function countWith(
  agents: AgentDefinition[],
  predicate: (a: AgentDefinition) => boolean,
): number {
  return agents.filter(predicate).length;
}
