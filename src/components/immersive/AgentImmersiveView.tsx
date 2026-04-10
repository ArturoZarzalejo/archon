'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  Cpu,
  FileText,
  Layers,
  Settings,
  GitBranch,
  Wrench,
  Eye,
  EyeOff,
} from 'lucide-react';
import SpatialPanel from './SpatialPanel';

const ImmersiveScene = dynamic(() => import('./ImmersiveScene'), { ssr: false });

const providerAccent: Record<string, string> = {
  openai: '#22c55e',
  anthropic: '#a855f7',
  google: '#3b82f6',
  custom: '#6366f1',
};

interface AgentImmersiveViewProps {
  agent: Record<string, unknown>;
  connectedAgents: Record<string, unknown>[];
}

export default function AgentImmersiveView({ agent, connectedAgents }: AgentImmersiveViewProps) {
  const [showPanels, setShowPanels] = useState(true);

  const id = agent.id as string;
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
  const tools = (agent.tools as string[]) ?? [];
  const tags = (agent.tags as string[]) ?? [];
  const metrics = agent.metrics as Record<string, unknown> | undefined;

  const accent = providerAccent[provider];

  return (
    <div className="fixed inset-0 bg-[#0a0a1e]">
      {/* 3D Scene */}
      <ImmersiveScene />

      {/* Top bar */}
      <div className="fixed top-5 left-5 right-5 z-50 flex items-center justify-between">
        <Link
          href={`/agent/${id}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-interactive text-text-secondary hover:text-text transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back to {name}
        </Link>

        <div className="flex items-center gap-3">
          {/* Toggle panels */}
          <button
            onClick={() => setShowPanels(!showPanels)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass glass-interactive text-text-secondary hover:text-text transition-colors text-sm"
            title={showPanels ? 'Hide panels' : 'Show panels'}
          >
            {showPanels ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          {/* Agent badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
            <span className="text-sm font-display font-semibold text-text">{name}</span>
            {version && <span className="text-xs text-text-muted">v{version}</span>}
          </div>
        </div>
      </div>

      {/* Spatial Panels — agent info overlay */}
      {showPanels && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {/* Left column — Identity + Config */}
          <div className="absolute top-24 left-5 flex flex-col gap-4 pointer-events-auto" style={{ width: '340px' }}>
            {/* Agent Identity */}
            <SpatialPanel
              panelId="identity"
              title="Agent"
              icon={<Cpu size={14} style={{ color: accent }} />}
              accent={accent}
              enterFrom="left"
              staggerIndex={0}
              width="340px"
            >
              <div className="flex flex-col gap-3">
                <p className="text-sm text-text-secondary leading-relaxed">{description}</p>

                <div className="flex flex-wrap gap-2">
                  <Badge color={statusColor(status)}>{status}</Badge>
                  {model && <Badge color={accent}>{model}</Badge>}
                  {module_ && <Badge color="#71717a">{module_}</Badge>}
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map(t => (
                      <span key={t} className="text-[10px] text-text-muted bg-white/5 rounded px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                )}

                {/* Metrics */}
                {metrics && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    {metrics.avgLatencyMs != null && <MetricItem label="Latency" value={`${metrics.avgLatencyMs}ms`} />}
                    {metrics.avgTokensIn != null && <MetricItem label="Tokens In" value={String(metrics.avgTokensIn)} />}
                    {metrics.avgTokensOut != null && <MetricItem label="Tokens Out" value={String(metrics.avgTokensOut)} />}
                    {metrics.successRate != null && <MetricItem label="Success" value={`${Math.round((metrics.successRate as number) * 100)}%`} />}
                    {metrics.estimatedCostPer1k != null && <MetricItem label="Cost/1k" value={`$${metrics.estimatedCostPer1k}`} />}
                  </div>
                )}
              </div>
            </SpatialPanel>

            {/* Config */}
            {config && (
              <SpatialPanel
                panelId="config"
                title="Configuration"
                icon={<Settings size={14} style={{ color: accent }} />}
                accent={accent}
                enterFrom="left"
                staggerIndex={1}
                collapsible
                width="340px"
              >
                <div className="flex flex-col gap-2">
                  {config.temperature != null && <ConfigRow label="Temperature" value={String(config.temperature)} />}
                  {config.maxTokens != null && <ConfigRow label="Max Tokens" value={String(config.maxTokens)} />}
                  {typeof (config.reasoning as Record<string, unknown>)?.effort === 'string' && (
                    <ConfigRow label="Reasoning" value={(config.reasoning as Record<string, unknown>).effort as string} />
                  )}
                  {config.caching != null && <ConfigRow label="Caching" value={String(config.caching)} />}
                </div>
              </SpatialPanel>
            )}

            {/* Tools / Skills */}
            {tools.length > 0 && (
              <SpatialPanel
                panelId="tools"
                title="Skills & Tools"
                icon={<Wrench size={14} style={{ color: accent }} />}
                accent={accent}
                enterFrom="left"
                staggerIndex={2}
                width="340px"
              >
                <div className="flex flex-wrap gap-2">
                  {tools.map(tool => (
                    <span key={tool} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-text-secondary border border-white/8">
                      <Wrench size={10} className="text-text-muted" />
                      {tool}
                    </span>
                  ))}
                </div>
              </SpatialPanel>
            )}
          </div>

          {/* Right column — Prompt + Schema + Dependencies */}
          <div className="absolute top-24 right-5 flex flex-col gap-4 pointer-events-auto" style={{ width: '400px' }}>
            {/* Prompt */}
            {prompt && (
              <SpatialPanel
                panelId="prompt"
                title="Prompt"
                icon={<FileText size={14} style={{ color: accent }} />}
                accent={accent}
                enterFrom="right"
                staggerIndex={0}
                collapsible
                width="400px"
              >
                <pre className="text-xs leading-relaxed text-text-secondary font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto scrollbar-hide">
                  {prompt}
                </pre>
              </SpatialPanel>
            )}

            {/* Schema */}
            {(input || output) && (
              <SpatialPanel
                panelId="schema"
                title="Schema"
                icon={<Layers size={14} style={{ color: accent }} />}
                accent={accent}
                enterFrom="right"
                staggerIndex={1}
                collapsible
                width="400px"
              >
                <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto scrollbar-hide">
                  {input && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Input</span>
                      {typeof input.description === 'string' && <p className="text-xs text-text-secondary mt-0.5">{input.description as string}</p>}
                      {input.example != null && (
                        <pre className="text-[11px] text-text-muted font-mono mt-1 bg-white/3 rounded-lg p-2 overflow-x-auto">
                          {JSON.stringify(input.example, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                  {output && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Output</span>
                      {typeof output.description === 'string' && <p className="text-xs text-text-secondary mt-0.5">{output.description as string}</p>}
                      {output.example != null && (
                        <pre className="text-[11px] text-text-muted font-mono mt-1 bg-white/3 rounded-lg p-2 overflow-x-auto">
                          {JSON.stringify(output.example, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </SpatialPanel>
            )}

            {/* Dependencies */}
            {(dependsOn.length > 0 || feeds.length > 0) && (
              <SpatialPanel
                panelId="dependencies"
                title="Dependencies"
                icon={<GitBranch size={14} style={{ color: accent }} />}
                accent={accent}
                enterFrom="right"
                staggerIndex={2}
                width="400px"
              >
                <div className="flex flex-col gap-3">
                  {dependsOn.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Depends On</span>
                      <div className="flex flex-col gap-1 mt-1">
                        {dependsOn.map(dep => {
                          const connected = connectedAgents.find(a => a.id === dep);
                          return (
                            <Link
                              key={dep}
                              href={`/agent/${dep}`}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-white/5 hover:text-text transition-colors"
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-text-muted" />
                              <span className="font-medium">{connected ? connected.name as string : dep}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {feeds.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Feeds Into</span>
                      <div className="flex flex-col gap-1 mt-1">
                        {feeds.map(feed => {
                          const connected = connectedAgents.find(a => a.id === feed);
                          return (
                            <Link
                              key={feed}
                              href={`/agent/${feed}`}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-white/5 hover:text-text transition-colors"
                            >
                              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                              <span className="font-medium">{connected ? connected.name as string : feed}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </SpatialPanel>
            )}
          </div>
        </div>
      )}

      {/* WASD hint */}
      <div className="fixed bottom-5 right-5 z-50">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl glass text-text-muted text-xs">
          <div className="flex flex-col items-center gap-0.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">W</kbd>
            <div className="flex gap-0.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">A</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">S</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">D</kbd>
            </div>
          </div>
          <span className="text-text-secondary">Move</span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Badge({ children, color }: { children: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {children}
    </span>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-medium uppercase tracking-wider text-text-muted">{label}</span>
      <span className="text-xs font-medium text-text tabular-nums">{value}</span>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-xs font-medium text-text font-mono">{value}</span>
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case 'active': return '#22c55e';
    case 'experimental': return '#f59e0b';
    case 'deprecated': return '#ef4444';
    case 'legacy': return '#71717a';
    default: return '#71717a';
  }
}
