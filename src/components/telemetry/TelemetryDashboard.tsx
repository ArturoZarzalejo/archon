'use client';

import { useState } from 'react';
import {
  Bot,
  GitBranch,
  Cpu,
  Shield,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Info,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { TelemetryEvent } from '@/lib/telemetry';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';

// ============================================================================
// Props
// ============================================================================

interface TelemetryDashboardProps {
  telemetry: TelemetryEvent;
  telemetryEnabled?: boolean;
}

// ============================================================================
// Schema adoption field labels
// ============================================================================

const SCHEMA_FIELDS: { key: keyof TelemetryEvent['data']['schemaAdoption']; label: string }[] = [
  { key: 'hasPrompt', label: 'Prompt' },
  { key: 'hasInputSchema', label: 'Input Schema' },
  { key: 'hasOutputSchema', label: 'Output Schema' },
  { key: 'hasExamples', label: 'Examples' },
  { key: 'hasTools', label: 'Tools' },
  { key: 'hasGuardrails', label: 'Guardrails' },
  { key: 'hasHandoffs', label: 'Handoffs' },
  { key: 'hasErrors', label: 'Error Handling' },
  { key: 'hasHooks', label: 'Hooks' },
  { key: 'hasRuntime', label: 'Runtime' },
  { key: 'hasSla', label: 'SLA' },
  { key: 'hasSecrets', label: 'Secrets' },
  { key: 'hasMetrics', label: 'Metrics' },
  { key: 'hasEvaluations', label: 'Evaluations' },
];

// ============================================================================
// Status badge colors
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  deprecated: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  experimental: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  legacy: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-500/15 text-green-400 border-green-500/30',
  anthropic: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  google: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  custom: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  unknown: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

// ============================================================================
// Component
// ============================================================================

export function TelemetryDashboard({ telemetry, telemetryEnabled = false }: TelemetryDashboardProps) {
  const { data } = telemetry;
  const totalAgents = data.totalAgents;
  const [enabled, setEnabled] = useState(telemetryEnabled);

  // Generate recommendations
  const recommendations = generateRecommendations(data);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Telemetry opt-in toggle ──────────────────────────────── */}
      <Card>
        <CardContent className="flex items-start gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text">
                Community Telemetry
              </span>
              <Toggle
                pressed={enabled}
                onPressedChange={(pressed) => setEnabled(pressed)}
                variant="outline"
                size="sm"
                aria-label="Toggle telemetry"
                className={cn(
                  'text-xs',
                  enabled
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                    : 'border-zinc-500/30 text-zinc-400',
                )}
              >
                {enabled ? 'Enabled' : 'Disabled'}
              </Toggle>
            </div>
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground/70">
              <Info size={12} className="mt-0.5 shrink-0" />
              <span>
                When enabled, anonymous usage patterns (agent counts, providers, schema adoption)
                are shared to help improve Archon. No prompts, secrets, API keys, file paths, or
                personally identifiable information is ever collected.
                Set <code className="rounded bg-muted px-1 py-0.5 text-[11px]">telemetry.enabled: true</code> in
                your <code className="rounded bg-muted px-1 py-0.5 text-[11px]">archon.config.ts</code> to persist this choice.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Row 1: Overview cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <OverviewCard
          icon={Bot}
          label="Total Agents"
          value={totalAgents}
          detail={`${data.legacyAgents} legacy`}
        />
        <OverviewCard
          icon={GitBranch}
          label="Pipelines"
          value={data.totalPipelines}
          detail={`${data.avgStagesPerPipeline} avg stages`}
        />
        <OverviewCard
          icon={Cpu}
          label="Models"
          value={data.modelsUsed.length}
          detail={data.modelsUsed.slice(0, 3).join(', ') || 'none'}
        />
      </div>

      {/* ── Row 2: Schema adoption + distributions ────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Schema Adoption */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              Schema Adoption
            </CardTitle>
            <CardDescription>
              Which optional fields are defined across your {totalAgents} agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] overflow-y-auto scrollbar-hide pr-3">
              <div className="flex flex-col gap-3">
                {SCHEMA_FIELDS.map(({ key, label }) => {
                  const count = data.schemaAdoption[key];
                  const pct =
                    totalAgents > 0
                      ? Math.round((count / totalAgents) * 100)
                      : 0;

                  return (
                    <Progress key={key} value={pct}>
                      <ProgressLabel className="min-w-[110px] text-xs">
                        {label}
                      </ProgressLabel>
                      <ProgressValue>
                        {() => `${count}/${totalAgents} (${pct}%)`}
                      </ProgressValue>
                    </Progress>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Provider + Status distribution */}
        <div className="flex flex-col gap-4">
          {/* Provider Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu size={16} className="text-primary" />
                Provider Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.agentsByProvider)
                  .sort(([, a], [, b]) => b - a)
                  .map(([provider, count]) => (
                    <Badge
                      key={provider}
                      className={cn(
                        'border px-3 py-1 text-xs font-medium',
                        PROVIDER_COLORS[provider] ?? PROVIDER_COLORS.unknown,
                      )}
                    >
                      {provider} ({count})
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.agentsByStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => (
                    <Badge
                      key={status}
                      className={cn(
                        'border px-3 py-1 text-xs font-medium',
                        STATUS_COLORS[status] ?? STATUS_COLORS.legacy,
                      )}
                    >
                      {status} ({count})
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Module Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot size={16} className="text-primary" />
                Module Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.agentsByModule)
                  .sort(([, a], [, b]) => b - a)
                  .map(([mod, count]) => (
                    <Badge
                      key={mod}
                      variant="secondary"
                      className="px-3 py-1 text-xs font-medium"
                    >
                      {mod} ({count})
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Row 3: Recommendations ───────────────────────────────── */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb size={16} className="text-amber-400" />
              Recommendations
            </CardTitle>
            <CardDescription>
              Suggestions based on schema adoption patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-amber-400"
                  />
                  <p className="text-sm text-muted-foreground">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Footer: metadata ─────────────────────────────────────── */}
      <Separator />
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground/60">
        <span>Archon v{telemetry.archonVersion}</span>
        <span>Snapshot: {new Date(telemetry.timestamp).toLocaleString()}</span>
        <span className="ml-auto">
          Project hash: {telemetry.projectHash.slice(0, 12)}...
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Overview card sub-component
// ============================================================================

function OverviewCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            'bg-primary/10 text-primary',
          )}
        >
          <Icon size={20} />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-bold tabular-nums text-text">
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-[10px] text-muted-foreground/60">{detail}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Generate recommendations based on adoption data
// ============================================================================

function generateRecommendations(
  data: TelemetryEvent['data'],
): string[] {
  const recs: string[] = [];
  const total = data.totalAgents;

  if (total === 0) return ['No agents found. Define your first agent to see insights.'];

  const {
    hasGuardrails,
    hasErrors,
    hasMetrics,
    hasEvaluations,
    hasInputSchema,
    hasOutputSchema,
    hasSla,
    hasSecrets,
  } = data.schemaAdoption;

  if (hasGuardrails < total * 0.3) {
    recs.push(
      `Only ${hasGuardrails}/${total} agents have guardrails defined. Adding input/output guardrails improves reliability and safety.`,
    );
  }

  if (hasErrors < total * 0.3) {
    recs.push(
      `Only ${hasErrors}/${total} agents define error handling. Specifying known errors and retry strategies prevents silent failures.`,
    );
  }

  if (hasMetrics < total * 0.5) {
    recs.push(
      `Only ${hasMetrics}/${total} agents track metrics. Adding metrics helps identify performance regressions and cost spikes.`,
    );
  }

  if (hasEvaluations < total * 0.2) {
    recs.push(
      `Only ${hasEvaluations}/${total} agents have evaluations. Running eval datasets builds confidence before deploying prompt changes.`,
    );
  }

  if (hasInputSchema < total * 0.5 || hasOutputSchema < total * 0.5) {
    recs.push(
      `${total - hasInputSchema} agents lack input schemas and ${total - hasOutputSchema} lack output schemas. Defining I/O contracts enables type-safe agent composition.`,
    );
  }

  if (hasSla === 0 && total >= 3) {
    recs.push(
      'No agents define SLA targets. Setting latency and uptime goals helps prioritize optimization work.',
    );
  }

  if (hasSecrets > 0 && hasSecrets < total * 0.5) {
    recs.push(
      `${hasSecrets}/${total} agents declare secrets. Documenting required secrets prevents deployment failures.`,
    );
  }

  if (data.legacyAgents > 0) {
    recs.push(
      `${data.legacyAgents} agents are still in legacy (markdown) format. Migrating to .agent.ts unlocks full schema validation.`,
    );
  }

  return recs;
}
