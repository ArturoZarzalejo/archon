'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Cpu,
  FileText,
  Layers,
  Settings,
  GitBranch,
  Wrench,
  Eye,
  EyeOff,
  HeartPulse,
  Shield,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import ImmersiveScene from './ImmersiveScene';
import SpatialPanel from './SpatialPanel';

const providerAccent: Record<string, string> = {
  openai: '#22c55e',
  anthropic: '#a855f7',
  google: '#3b82f6',
  custom: '#6366f1',
};

interface Props {
  agent: Record<string, unknown>;
}

type Phase = 'intro' | 'ready';

interface Recommendation {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'tip';
  category: string;
  title: string;
  description: string;
}

interface HealthResponse {
  healthScore: number;
  bySeverity: Record<string, number>;
  recommendations: Recommendation[];
}

export default function AgentImmersiveEmbed({ agent }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [showPanels, setShowPanels] = useState(true);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);

  const name = agent.name as string;
  const description = agent.description as string;
  const model = agent.model as string | undefined;
  const provider = (agent.provider as string) ?? 'custom';
  const status = (agent.status as string) ?? 'active';
  const version = agent.version as string | undefined;
  const module_ = agent.module as string | undefined;
  const prompt = agent.prompt as string | undefined;
  const config = agent.config as Record<string, unknown> | undefined;
  const input = agent.input as Record<string, unknown> | undefined;
  const output = agent.output as Record<string, unknown> | undefined;
  const dependsOn = (agent.dependsOn as string[]) ?? [];
  const feeds = (agent.feeds as string[]) ?? [];
  const tools = (agent.tools as (string | Record<string, unknown>)[]) ?? [];
  const tags = (agent.tags as string[]) ?? [];
  const metrics = agent.metrics as Record<string, unknown> | undefined;

  const id = agent.id as string;
  const evaluations = (agent.evaluations as Record<string, unknown>[]) ?? [];
  const guardrails = (agent.guardrails as Record<string, unknown>[]) ?? [];
  const errors = (agent.errors as Record<string, unknown>[]) ?? [];

  const accent = providerAccent[provider];
  const toolNames = tools.map(t => typeof t === 'string' ? t : (t.name as string));

  // Fetch health recommendations
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(id)}/recommendations`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setHealthData(json);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const onSceneReady = useCallback(() => {
    // Small delay so the first frame actually paints before we transition
    setTimeout(() => setPhase('ready'), 100);
  }, []);

  return (
    <div className="relative w-full h-full bg-[#0a0a1e]">
      {/* 3D Scene — always mounting, fades in when ready */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: phase === 'ready' ? 1 : 0,
          transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <ImmersiveScene
          accentColor={accent}
          onReady={onSceneReady}
          agentName={name}
          model={model}
          healthScore={healthData?.healthScore ?? (metrics?.successRate != null ? Math.round((metrics.successRate as number) * 100) : undefined)}
          tokenCount={metrics?.avgTokensIn as number | undefined}
          dependencyCount={dependsOn.length + feeds.length}
          dependencies={dependsOn}
          feeds={feeds}
        />
      </div>

      {/* Cinematic intro — fades out when scene is ready */}
      <div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        style={{
          opacity: phase === 'intro' ? 1 : 0,
          transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="flex flex-col items-center gap-5">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.svg" alt="Archon" className="h-10 w-10 opacity-80" />
          {/* Agent name */}
          <span className="font-display text-base font-bold tracking-wide text-white/80">
            {name}
          </span>
          {/* Subtle loading bar */}
          <div className="h-px w-16 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full animate-shimmer"
              style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, width: '200%' }}
            />
          </div>
        </div>
      </div>

      {/* Spatial Panels */}
      {showPanels && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          {/* Left column — below nav buttons (top-4 + button height ~36px + gap) */}
          <div className="absolute top-[60px] left-[92px] flex flex-col gap-3 pointer-events-auto scrollbar-hide" style={{ width: '300px', maxHeight: 'calc(100% - 80px)', overflowY: 'auto' }}>
            {/* Identity — agent name is the hero */}
            <SpatialPanel panelId="identity" title="Agent" icon={<Cpu size={12} style={{ color: accent }} />} accent={accent} enterFrom="left" staggerIndex={0} width="300px">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}50` }} />
                  <span className="font-display text-lg font-bold tracking-tight text-white">{name}</span>
                </div>
                <p className="text-xs text-text/70 leading-relaxed">{description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <MiniTag color={statusColor(status)}>{status}</MiniTag>
                  {model && <MiniTag color={accent}>{model}</MiniTag>}
                  {module_ && <MiniTag color="#71717a">{module_}</MiniTag>}
                  {version && <MiniTag color="#8b5cf6">{`v${version}`}</MiniTag>}
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map(tag => (
                      <span key={tag} className="text-[9px] text-text-muted/60 bg-white/[0.03] rounded px-1.5 py-px border border-white/5">{tag}</span>
                    ))}
                  </div>
                )}
                {metrics && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-white/5">
                    {metrics.avgLatencyMs != null && <Metric label="Latency" value={`${metrics.avgLatencyMs}ms`} />}
                    {metrics.successRate != null && <Metric label="Success" value={`${Math.round((metrics.successRate as number) * 100)}%`} />}
                    {metrics.estimatedCostPer1k != null && <Metric label="Cost/1k" value={`$${metrics.estimatedCostPer1k}`} />}
                    {metrics.avgTokensIn != null && <Metric label="Tokens" value={`${metrics.avgTokensIn}→${metrics.avgTokensOut ?? '?'}`} />}
                  </div>
                )}
              </div>
            </SpatialPanel>

            {/* Config */}
            {config && (
              <SpatialPanel panelId="config" title="Config" icon={<Settings size={12} style={{ color: accent }} />} accent={accent} enterFrom="left" staggerIndex={1} collapsible width="280px">
                <div className="flex flex-col gap-1.5">
                  {config.temperature != null && <CfgRow label="Temperature" value={String(config.temperature)} />}
                  {config.maxTokens != null && <CfgRow label="Max Tokens" value={String(config.maxTokens)} />}
                  {typeof (config.reasoning as Record<string, unknown>)?.effort === 'string' && <CfgRow label="Reasoning" value={String((config.reasoning as Record<string, unknown>).effort)} />}
                  {config.maxRetries != null && <CfgRow label="Retries" value={String(config.maxRetries)} />}
                  {config.rateLimit != null && <CfgRow label="Rate Limit" value={`${config.rateLimit}/min`} />}
                </div>
              </SpatialPanel>
            )}

            {/* Tools */}
            {toolNames.length > 0 && (
              <SpatialPanel panelId="tools" title="Tools" icon={<Wrench size={12} style={{ color: accent }} />} accent={accent} enterFrom="left" staggerIndex={2} width="280px">
                <div className="flex flex-wrap gap-1.5">
                  {toolNames.map(t => (
                    <span key={t} className="text-[10px] text-text-secondary bg-white/5 rounded px-2 py-0.5 border border-white/5">{t}</span>
                  ))}
                </div>
              </SpatialPanel>
            )}

            {/* Health */}
            {healthData && (
              <SpatialPanel panelId="health" title="Health" icon={<HeartPulse size={12} style={{ color: accent }} />} accent={accent} enterFrom="left" staggerIndex={3} width="300px">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold tabular-nums ${healthData.healthScore >= 80 ? 'text-emerald-400' : healthData.healthScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {healthData.healthScore}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${healthData.healthScore}%`,
                          backgroundColor: healthData.healthScore >= 80 ? '#34d399' : healthData.healthScore >= 50 ? '#fbbf24' : '#f87171',
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    {healthData.bySeverity.critical > 0 && <span className="flex items-center gap-1 text-red-400"><span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />{healthData.bySeverity.critical}</span>}
                    {healthData.bySeverity.warning > 0 && <span className="flex items-center gap-1 text-amber-400"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />{healthData.bySeverity.warning}</span>}
                    {healthData.bySeverity.info > 0 && <span className="flex items-center gap-1 text-blue-400"><span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />{healthData.bySeverity.info}</span>}
                    {healthData.bySeverity.tip > 0 && <span className="flex items-center gap-1 text-emerald-400"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />{healthData.bySeverity.tip}</span>}
                  </div>
                  {healthData.recommendations.filter(r => r.severity === 'critical').length > 0 && (
                    <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                      {healthData.recommendations.filter(r => r.severity === 'critical').slice(0, 2).map(r => (
                        <span key={r.id} className="text-[10px] text-red-400/80 leading-tight">{r.title}</span>
                      ))}
                    </div>
                  )}
                </div>
              </SpatialPanel>
            )}

            {/* Evaluations */}
            {evaluations.length > 0 && (
              <SpatialPanel panelId="evaluations" title="Evaluations" icon={<Award size={12} style={{ color: accent }} />} accent={accent} enterFrom="left" staggerIndex={4} collapsible width="300px">
                <div className="flex flex-col gap-2">
                  {evaluations.map((ev, i) => (
                    <div key={i} className="flex flex-col gap-1 rounded-lg bg-white/[0.03] p-2 border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-text">{(ev.dataset as string) ?? (ev.name as string) ?? `Eval ${i + 1}`}</span>
                        {ev.date != null && <span className="text-[9px] text-text-muted">{String(ev.date)}</span>}
                      </div>
                      <div className="flex gap-2">
                        {ev.accuracy != null && <Metric label="Accuracy" value={`${Math.round(Number(ev.accuracy) * 100)}%`} />}
                        {ev.precision != null && <Metric label="Precision" value={`${Math.round(Number(ev.precision) * 100)}%`} />}
                        {ev.recall != null && <Metric label="Recall" value={`${Math.round(Number(ev.recall) * 100)}%`} />}
                        {ev.f1 != null && <Metric label="F1" value={`${Math.round(Number(ev.f1) * 100)}%`} />}
                        {ev.score != null && <Metric label="Score" value={String(ev.score)} />}
                      </div>
                    </div>
                  ))}
                </div>
              </SpatialPanel>
            )}

            {/* Safety — Guardrails & Errors */}
            {(guardrails.length > 0 || errors.length > 0) && (
              <SpatialPanel panelId="safety" title="Safety" icon={<Shield size={12} style={{ color: accent }} />} accent={accent} enterFrom="left" staggerIndex={5} collapsible width="300px">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {guardrails.length > 0 && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-2 py-0.5 border border-emerald-500/20">
                        {guardrails.length} guardrail{guardrails.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {errors.length > 0 && (
                      <span className="text-[10px] text-red-400 bg-red-500/10 rounded px-2 py-0.5 border border-red-500/20">
                        {errors.length} error{errors.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {guardrails.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {guardrails.map((g, i) => (
                        <span key={i} className="text-[10px] text-text-secondary bg-white/5 rounded px-2 py-0.5 border border-white/5">
                          {(g.name as string) ?? (g.type as string) ?? `Guard ${i + 1}`}
                        </span>
                      ))}
                    </div>
                  )}
                  {errors.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {errors.map((e, i) => (
                        <span key={i} className="text-[10px] text-red-400/70 bg-red-500/5 rounded px-2 py-0.5 border border-red-500/10">
                          {(e.code as string) ?? (e.type as string) ?? (e.message as string) ?? `Error ${i + 1}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </SpatialPanel>
            )}
          </div>

          {/* Right column — same top as left */}
          <div className="absolute top-[60px] right-5 flex flex-col gap-3 pointer-events-auto scrollbar-hide" style={{ width: '320px', maxHeight: 'calc(100% - 80px)', overflowY: 'auto' }}>
            {/* Prompt */}
            {prompt && (
              <SpatialPanel panelId="prompt" title="Prompt" icon={<FileText size={12} style={{ color: accent }} />} accent={accent} enterFrom="right" staggerIndex={0} collapsible width="320px">
                <pre className="text-[11px] leading-relaxed text-text/70 font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto scrollbar-hide">
                  {prompt}
                </pre>
              </SpatialPanel>
            )}

            {/* Schema */}
            {(input || output) && (
              <SpatialPanel panelId="schema" title="Schema" icon={<Layers size={12} style={{ color: accent }} />} accent={accent} enterFrom="right" staggerIndex={1} collapsible width="320px">
                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto scrollbar-hide">
                  {input && (
                    <div>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-text/50">Input</span>
                      {typeof input.description === 'string' && <p className="text-[11px] text-text/65">{input.description as string}</p>}
                      {input.example != null && <pre className="text-[10px] text-text-secondary/80 font-mono mt-1 bg-black/30 rounded p-2 overflow-x-auto">{JSON.stringify(input.example, null, 2)}</pre>}
                    </div>
                  )}
                  {output && (
                    <div>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-text/50">Output</span>
                      {typeof output.description === 'string' && <p className="text-[11px] text-text/65">{output.description as string}</p>}
                      {output.example != null && <pre className="text-[10px] text-text-secondary/80 font-mono mt-1 bg-black/30 rounded p-2 overflow-x-auto">{JSON.stringify(output.example, null, 2)}</pre>}
                    </div>
                  )}
                </div>
              </SpatialPanel>
            )}

            {/* Dependencies */}
            {(dependsOn.length > 0 || feeds.length > 0) && (
              <SpatialPanel panelId="deps" title="Dependencies" icon={<GitBranch size={12} style={{ color: accent }} />} accent={accent} enterFrom="right" staggerIndex={2} width="320px">
                <div className="flex flex-col gap-2">
                  {dependsOn.length > 0 && (
                    <div>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-text/50">Depends On</span>
                      {dependsOn.map(d => <DepLink key={d} id={d} />)}
                    </div>
                  )}
                  {feeds.length > 0 && (
                    <div>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-text/50">Feeds Into</span>
                      {feeds.map(f => <DepLink key={f} id={f} accent={accent} />)}
                    </div>
                  )}
                </div>
              </SpatialPanel>
            )}
          </div>
        </div>
      )}

      {/* Bottom bar: toggle + WASD */}
      <div className="absolute bottom-3 right-3 z-50 flex items-center gap-2">
        <button
          onClick={() => setShowPanels(!showPanels)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass glass-interactive text-text-muted hover:text-text text-[10px] transition-colors"
        >
          {showPanels ? <EyeOff size={12} /> : <Eye size={12} />}
          {showPanels ? 'Hide panels' : 'Show panels'}
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-text-muted text-[10px]">
          <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[9px]">WASD</kbd>
          <span>Move</span>
          <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[9px]">Shift</kbd>
          <span>Sprint</span>
        </div>
      </div>
    </div>
  );
}

function MiniTag({ children, color }: { children: string; color: string }) {
  return <span className="text-[10px] font-medium rounded px-1.5 py-0.5" style={{ backgroundColor: `${color}22`, color }}>{children}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[8px] uppercase tracking-wider text-text-muted">{label}</span>
      <span className="text-[11px] font-medium text-text tabular-nums">{value}</span>
    </div>
  );
}

function CfgRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-text-muted">{label}</span>
      <span className="text-[11px] font-medium text-text font-mono">{value}</span>
    </div>
  );
}

function DepLink({ id, accent }: { id: string; accent?: string }) {
  return (
    <Link href={`/agent/${id}?view=immersive`} className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-text/65 hover:bg-white/5 hover:text-text transition-colors">
      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent ?? '#71717a' }} />
      {id}
    </Link>
  );
}

function statusColor(s: string): string {
  switch (s) {
    case 'active': return '#22c55e';
    case 'experimental': return '#f59e0b';
    case 'deprecated': return '#ef4444';
    default: return '#71717a';
  }
}
