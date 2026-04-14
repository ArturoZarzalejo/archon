'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  Cpu,
  GitBranch,
  Settings,
  FileText,
  Layers,
  Code2,
  ChevronRight,
  Wrench,
  Activity,
  DollarSign,
  Clock,
  Zap,
  HeartPulse,
  Shield,
  RefreshCw,
  Star,
  Eye,
  Lightbulb,
  MonitorPlay,
  PanelLeft,
  Play,
  Clipboard,
  Loader2,
  Pencil,
  Save,
  Check,
  X,
  Plus,
  BookOpen,
  CheckCircle2,
  XCircle,
  PlayCircle,
  GitCompare,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const AgentImmersiveEmbed = dynamic(
  () => import('@/components/immersive/AgentImmersiveEmbed'),
  { ssr: false }
);

/* ------------------------------------------------------------------ */
/*  Color maps                                                         */
/* ------------------------------------------------------------------ */

const providerColor: Record<string, string> = {
  openai: 'bg-openai/15 text-openai',
  anthropic: 'bg-anthropic/15 text-anthropic',
  google: 'bg-google/15 text-google',
  custom: 'bg-muted text-muted-foreground',
};

const providerGradient: Record<string, string> = {
  openai: 'from-emerald-400 via-green-500 to-teal-400',
  anthropic: 'from-violet-400 via-purple-500 to-fuchsia-400',
  google: 'from-blue-400 via-sky-500 to-cyan-400',
  custom: 'from-zinc-500 via-zinc-400 to-zinc-500',
};

const providerAccent: Record<string, string> = {
  openai: '#22c55e',
  anthropic: '#a855f7',
  google: '#3b82f6',
  custom: '#6366f1',
};

const statusColors: Record<string, string> = {
  active: 'bg-success/15 text-success',
  experimental: 'bg-warning/15 text-warning',
  deprecated: 'bg-danger/15 text-danger',
  legacy: 'bg-muted text-muted-foreground',
};

/* ------------------------------------------------------------------ */
/*  View mode                                                          */
/* ------------------------------------------------------------------ */

type ViewMode = 'detail' | 'immersive';

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const VALID_TABS = ['schema', 'prompt', 'config', 'dependencies', 'health', 'playground', 'stories', 'compare', 'edit'] as const;

export function AgentDetail({ agent, initialView = 'detail', initialTab }: { agent: Record<string, unknown>; initialView?: ViewMode; initialTab?: string }) {
  const [view, setView] = useState<ViewMode>(initialView);

  // Sync tab changes to URL so reload preserves the tab
  const syncTabToUrl = useCallback((tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  }, []);

  // Sync view changes to URL
  const handleViewChange = useCallback((v: ViewMode) => {
    setView(v);
    const url = new URL(window.location.href);
    if (v === 'immersive') {
      url.searchParams.set('view', 'immersive');
    } else {
      url.searchParams.delete('view');
    }
    window.history.replaceState(null, '', url.toString());
  }, []);

  const name = agent.name as string;
  const description = agent.description as string;
  const version = agent.version as string | undefined;
  const model = agent.model as string | undefined;
  const provider = (agent.provider as string) ?? 'custom';
  const status = (agent.status as string) ?? 'active';
  const module_ = agent.module as string | undefined;
  const tags = (agent.tags as string[]) ?? [];
  const prompt = agent.prompt as string | undefined;
  const config = agent.config as Record<string, unknown> | undefined;
  const input = agent.input as Record<string, unknown> | undefined;
  const output = agent.output as Record<string, unknown> | undefined;
  const dependsOn = (agent.dependsOn as string[]) ?? [];
  const feeds = (agent.feeds as string[]) ?? [];
  const metrics = agent.metrics as Record<string, unknown> | undefined;
  const id = agent.id as string;

  // Track if returning from immersive for smooth entry animation
  const [returnedFromImmersive, setReturnedFromImmersive] = useState(false);

  const goImmersive = () => handleViewChange('immersive');
  const goDetail = () => {
    setReturnedFromImmersive(true);
    handleViewChange('detail');
  };

  /* ── Immersive: full area, only back buttons floating ── */
  if (view === 'immersive') {
    return (
      <div className="fixed inset-0 z-30" style={{ background: '#0a0a1e' }}>
        <AgentImmersiveEmbed agent={agent} />

        {/* Floating nav — top-left, compact */}
        <div className="fixed top-4 left-[92px] z-50 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="glass backdrop-blur-xl animate-slide-in-left"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <ArrowLeft size={16} />
            Catalog
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="glass backdrop-blur-xl animate-slide-in-left animate-delay-100"
            onClick={goDetail}
          >
            <PanelLeft size={16} />
            Detail
          </Button>
        </div>
      </div>
    );
  }

  /* ── Detail: normal layout ── */
  return (
    <div className={cn('flex flex-col gap-5', returnedFromImmersive ? 'animate-return-to-detail' : 'animate-fade-in-up')}>
      {/* ── Nav bar ── */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="w-fit" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeft size={16} />
          Catalog
        </Button>
        <Button variant="outline" size="sm" onClick={goImmersive}>
          <MonitorPlay size={16} />
          Immersive
        </Button>
      </div>

      {/* ── Agent Header ── */}
      <Card className="glass glass-highlight overflow-hidden border-0 p-0">
        <div className={cn('h-[2px] w-full bg-gradient-to-r', providerGradient[provider])} />

        <CardHeader className="gap-3 px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="font-display text-2xl font-bold">{name}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {version && <Badge variant="secondary" className="shrink-0">v{version}</Badge>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn('rounded-lg', statusColors[status])}>{status}</Badge>
            {model && (
              <Badge className={cn('gap-1.5 rounded-lg', providerColor[provider])}>
                <Cpu size={12} /> {model}
              </Badge>
            )}
            {module_ && <Badge variant="outline" className="rounded-lg">{module_}</Badge>}
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-lg font-normal">{tag}</Badge>
            ))}
          </div>

          {metrics && (
            <>
              <Separator className="mt-1" />
              <div className="flex flex-wrap items-center gap-5 pt-1">
                {metrics.avgLatencyMs != null && <MiniMetric icon={<Clock size={11} />} label="Latency" value={`${metrics.avgLatencyMs}ms`} />}
                {metrics.avgTokensIn != null && <MiniMetric icon={<Zap size={11} />} label="Tokens In" value={String(metrics.avgTokensIn)} />}
                {metrics.avgTokensOut != null && <MiniMetric icon={<Activity size={11} />} label="Out" value={String(metrics.avgTokensOut)} />}
                {metrics.estimatedCostPer1k != null && <MiniMetric icon={<DollarSign size={11} />} label="Cost/1k" value={`$${metrics.estimatedCostPer1k}`} />}
                {metrics.successRate != null && <MiniMetric icon={<Activity size={11} />} label="Success" value={`${Math.round((metrics.successRate as number) * 100)}%`} />}
              </div>
            </>
          )}
        </CardHeader>
      </Card>

      {/* ── Tabs ── */}
      <Tabs defaultValue={VALID_TABS.includes(initialTab as typeof VALID_TABS[number]) ? initialTab : 'schema'} onValueChange={syncTabToUrl}>
        <TabsList variant="line">
          <TabsTrigger value="schema"><Layers size={14} /> Schema</TabsTrigger>
          <TabsTrigger value="prompt"><FileText size={14} /> Prompt</TabsTrigger>
          <TabsTrigger value="config"><Settings size={14} /> Config</TabsTrigger>
          <TabsTrigger value="dependencies"><GitBranch size={14} /> Dependencies</TabsTrigger>
          <TabsTrigger value="health"><HeartPulse size={14} /> Health</TabsTrigger>
          <TabsTrigger value="playground"><Play size={14} /> Playground</TabsTrigger>
          <TabsTrigger value="stories"><BookOpen size={14} /> Stories</TabsTrigger>
          <TabsTrigger value="compare"><GitCompare size={14} /> Compare</TabsTrigger>
          {Boolean(agent.sourceFile) && <TabsTrigger value="edit"><Pencil size={14} /> Edit</TabsTrigger>}
        </TabsList>

        <Card className="glass border-0">
          <CardContent className="py-4">
            <TabsContent value="schema"><SchemaTab input={input} output={output} /></TabsContent>
            <TabsContent value="prompt"><PromptTab prompt={prompt} /></TabsContent>
            <TabsContent value="config"><ConfigTab model={model} provider={provider} config={config} /></TabsContent>
            <TabsContent value="dependencies"><DependenciesTab dependsOn={dependsOn} feeds={feeds} /></TabsContent>
            <TabsContent value="health"><HealthTab agentId={id} /></TabsContent>
            <TabsContent value="playground"><PlaygroundTab agent={agent} /></TabsContent>
            <TabsContent value="stories"><StoriesTab agent={agent} /></TabsContent>
            <TabsContent value="compare"><CompareTab agent={agent} /></TabsContent>
            {Boolean(agent.sourceFile) && (
              <TabsContent value="edit">
                <EditTab agent={agent} />
              </TabsContent>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini metric (for header)                                           */
/* ------------------------------------------------------------------ */

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab panels                                                         */
/* ------------------------------------------------------------------ */

function SchemaTab({ input, output }: { input?: Record<string, unknown>; output?: Record<string, unknown> }) {
  if (!input && !output) return <Empty msg="No schema defined." />;
  return (
    <div className="flex flex-col gap-6">
      {input && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Input</h3>
          {typeof input.description === 'string' && <p className="text-sm text-muted-foreground">{input.description}</p>}
          {input.example != null && (
            <div className="max-h-80 overflow-y-auto rounded-xl bg-muted/50 scrollbar-hide">
              <pre className="p-4 text-xs leading-relaxed text-muted-foreground font-mono"><code>{JSON.stringify(input.example, null, 2)}</code></pre>
            </div>
          )}
        </section>
      )}
      {input && output && <Separator />}
      {output && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Output</h3>
          {typeof output.description === 'string' && <p className="text-sm text-muted-foreground">{output.description}</p>}
          {output.example != null && (
            <div className="max-h-80 overflow-y-auto rounded-xl bg-muted/50 scrollbar-hide">
              <pre className="p-4 text-xs leading-relaxed text-muted-foreground font-mono"><code>{JSON.stringify(output.example, null, 2)}</code></pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function PromptTab({ prompt }: { prompt?: string }) {
  if (!prompt) return <Empty msg="No prompt defined." />;
  return (
    <div className="max-h-[500px] overflow-y-auto rounded-xl bg-muted/50 scrollbar-hide">
      <pre className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-muted-foreground font-mono">{prompt}</pre>
    </div>
  );
}

function ConfigTab({ model, provider, config }: { model?: string; provider: string; config?: Record<string, unknown> }) {
  const reasoning = config?.reasoning as Record<string, unknown> | undefined;
  const fields = [
    { label: 'Model', value: model, icon: <Cpu size={14} /> },
    { label: 'Provider', value: provider !== 'custom' ? provider : undefined, icon: <Wrench size={14} /> },
    { label: 'Temperature', value: config?.temperature, icon: <Activity size={14} /> },
    { label: 'Max Tokens', value: config?.maxTokens, icon: <Zap size={14} /> },
    { label: 'Reasoning', value: reasoning?.effort, icon: <Settings size={14} /> },
    { label: 'Caching', value: config?.caching != null ? String(config.caching) : undefined, icon: <Clock size={14} /> },
  ].filter((f) => f.value != null);

  if (fields.length === 0) return <Empty msg="No configuration defined." />;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(({ label, value, icon }) => (
        <div key={label} className="flex flex-col gap-1 rounded-lg bg-muted/30 p-3">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{icon} {label}</span>
          <span className="text-sm font-medium">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

function DependenciesTab({ dependsOn, feeds }: { dependsOn: string[]; feeds: string[] }) {
  if (dependsOn.length === 0 && feeds.length === 0) return <Empty msg="No dependencies defined." />;
  return (
    <div className="flex flex-col gap-6">
      {dependsOn.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Depends On</h3>
          <ul className="flex flex-col gap-1">
            {dependsOn.map((dep) => (
              <li key={dep}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-1.5" nativeButton={false} render={<Link href={`/agent/${dep}`} />}>
                  <Code2 size={14} className="text-muted-foreground" /> {dep} <ChevronRight size={12} className="ml-auto text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {dependsOn.length > 0 && feeds.length > 0 && <Separator />}
      {feeds.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Feeds Into</h3>
          <ul className="flex flex-col gap-1">
            {feeds.map((feed) => (
              <li key={feed}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-1.5" nativeButton={false} render={<Link href={`/agent/${feed}`} />}>
                  <Code2 size={14} className="text-muted-foreground" /> {feed} <ChevronRight size={12} className="ml-auto text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Health tab                                                         */
/* ------------------------------------------------------------------ */

interface Recommendation {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'tip';
  category: 'security' | 'reliability' | 'performance' | 'quality' | 'observability' | 'documentation';
  title: string;
  description: string;
  fix?: string;
}

interface HealthResponse {
  healthScore: number;
  bySeverity: Record<string, number>;
  recommendations: Recommendation[];
}

const severityConfig: Record<Recommendation['severity'], { color: string; bg: string; border: string; label: string }> = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Critical' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Warning' },
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Info' },
  tip: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Tip' },
};

const categoryIcons: Record<Recommendation['category'], React.ReactNode> = {
  security: <Shield size={16} />,
  reliability: <RefreshCw size={16} />,
  performance: <Zap size={16} />,
  quality: <Star size={16} />,
  observability: <Eye size={16} />,
  documentation: <FileText size={16} />,
};

function HealthTab({ agentId }: { agentId: string }) {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/recommendations`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  if (loading) return <div className="flex justify-center py-12"><div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" /></div>;
  if (error || !data) return <Empty msg={error ?? 'Could not load.'} />;
  if (data.recommendations.length === 0) return <div className="flex flex-col items-center gap-2 py-12"><span className="text-4xl font-bold text-emerald-400 tabular-nums">100</span><p className="text-sm text-muted-foreground">Perfect score!</p></div>;

  const scoreColor = data.healthScore >= 80 ? 'text-emerald-400' : data.healthScore >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-5 rounded-xl bg-muted/30 p-4">
        <div className="flex flex-col items-center gap-0.5">
          <span className={cn('text-3xl font-bold tabular-nums', scoreColor)}>{data.healthScore}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</span>
        </div>
        <Progress value={data.healthScore} className="flex-1 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-muted" />
        <div className="flex gap-2 text-xs">
          {Object.entries(data.bySeverity).filter(([, v]) => v > 0).map(([k, v]) => (
            <span key={k} className={cn('flex items-center gap-1', severityConfig[k as Recommendation['severity']]?.color)}>
              <span className={cn('inline-block h-1.5 w-1.5 rounded-full', severityConfig[k as Recommendation['severity']]?.bg)} /> {v}
            </span>
          ))}
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto scrollbar-hide">
        <div className="flex flex-col gap-2.5">
          {data.recommendations.map((rec) => {
            const sev = severityConfig[rec.severity];
            return (
              <div key={rec.id} className={cn('flex gap-3 rounded-xl border p-3.5', sev.bg, sev.border)}>
                <div className={cn('mt-0.5 shrink-0', sev.color)}>{categoryIcons[rec.category]}</div>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{rec.title}</span>
                    <Badge className={cn('rounded-md text-[10px] px-1.5 py-0', sev.bg, sev.color)}>{sev.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                  {rec.fix && (
                    <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5">
                      <Lightbulb size={11} className="mt-0.5 shrink-0 text-amber-400" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.fix}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Playground tab                                                     */
/* ------------------------------------------------------------------ */

interface ToolCallEvent { name?: string; arguments?: string; phase?: string; index?: number }
interface StreamStep { type: 'status' | 'token' | 'tool_call' | 'done' | 'error'; data: Record<string, unknown>; time: number }

function PlaygroundTab({ agent }: { agent: Record<string, unknown> }) {
  const id = agent.id as string;
  const input = agent.input as Record<string, unknown> | undefined;
  const model = agent.model as string | undefined;
  const provider = (agent.provider as string) ?? 'custom';
  const metrics = agent.metrics as Record<string, unknown> | undefined;

  const defaultInput = input?.example != null ? JSON.stringify(input.example, null, 2) : '{}';
  const [inputValue, setInputValue] = useState(defaultInput);
  const [outputTokens, setOutputTokens] = useState('');
  const [running, setRunning] = useState(false);
  const [isMock, setIsMock] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<StreamStep[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallEvent[]>([]);
  const [phase, setPhase] = useState<string>('idle');
  const outputRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(0);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setOutputTokens('');
    setIsMock(null);
    setError(null);
    setSteps([]);
    setToolCalls([]);
    setPhase('starting');
    startTime.current = Date.now();

    try {
      let parsedInput: unknown;
      try { parsedInput = JSON.parse(inputValue); }
      catch { setError('Invalid JSON input.'); setRunning(false); setPhase('idle'); return; }

      const res = await fetch(`/api/agents/${encodeURIComponent(id)}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: parsedInput }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(`Request failed: ${res.status} ${text}`);
        setRunning(false);
        setPhase('idle');
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!;

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            // Next line should be data:
            const dataIdx = lines.indexOf(line) + 1;
            // Actually, parse from buffer pattern
            continue;
          }
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            // Find the event type from the previous event: line
            const eventLine = lines[lines.indexOf(line) - 1];
            const eventType = eventLine?.startsWith('event: ') ? eventLine.slice(7) : 'unknown';

            const step: StreamStep = { type: eventType as StreamStep['type'], data, time: Date.now() - startTime.current };

            if (eventType === 'token') {
              setOutputTokens(prev => prev + (data.content ?? ''));
              // Auto-scroll
              if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }

            if (eventType === 'tool_call') {
              setToolCalls(prev => [...prev, data as ToolCallEvent]);
            }

            if (eventType === 'status') {
              setPhase(String(data.phase ?? 'running'));
            }

            if (eventType === 'error') {
              setError(String(data.message));
            }

            if (eventType === 'done') {
              setIsMock(Boolean(data.mock));
              setPhase('done');
            }

            setSteps(prev => [...prev, step]);
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setPhase('idle');
    } finally {
      setRunning(false);
    }
  }, [id, inputValue]);

  const elapsed = steps.length > 0 ? steps[steps.length - 1].time : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
          <X size={14} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs leading-relaxed text-red-400">{error}</p>
        </div>
      )}

      {/* Status bar — live execution steps */}
      {running && (
        <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground capitalize">{phase}...</span>
          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{elapsed}ms</span>
        </div>
      )}

      {/* Tool calls — shown as steps */}
      {toolCalls.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Tool Calls</span>
          {toolCalls.filter(tc => tc.name).map((tc, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <Wrench size={12} className="text-amber-400" />
              <span className="font-mono font-medium text-foreground">{tc.name}</span>
              {tc.arguments && (
                <span className="truncate text-muted-foreground font-mono text-[10px]">({tc.arguments})</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editor panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left — Input */}
        <Card className="border-border/40 bg-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clipboard size={14} className="text-muted-foreground" />
              Input
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="min-h-[240px] resize-none rounded-lg border-border/30 bg-background/80 font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
            <Button onClick={handleRun} disabled={running} className="w-full gap-2">
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {running ? 'Streaming...' : 'Run'}
            </Button>
          </CardContent>
        </Card>

        {/* Right — Streaming Output */}
        <Card className="border-border/40 bg-muted/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Code2 size={14} className="text-muted-foreground" />
                Output
                {running && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
              </CardTitle>
              {phase === 'done' && isMock !== null && (
                isMock ? (
                  <Badge variant="secondary" className="rounded-md text-[10px] bg-amber-500/10 text-amber-400">Mock</Badge>
                ) : (
                  <Badge variant="secondary" className="rounded-md text-[10px] bg-emerald-500/10 text-emerald-400">
                    Live · {elapsed}ms
                  </Badge>
                )
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div ref={outputRef} className="min-h-[240px] max-h-[360px] overflow-y-auto scrollbar-hide rounded-lg border border-border/30 bg-background/80 p-4">
              {outputTokens ? (
                <pre className="font-mono text-xs leading-relaxed text-emerald-400 whitespace-pre-wrap"><code>{outputTokens}</code>{running && <span className="inline-block w-1.5 h-3.5 bg-emerald-400 animate-pulse ml-0.5 align-middle" />}</pre>
              ) : !running ? (
                <div className="flex h-full min-h-[208px] items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Play size={24} className="opacity-30" />
                    <span className="text-xs">Click Run to stream output</span>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom bar */}
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {model && (
            <Badge className={cn('gap-1.5 rounded-lg', providerColor[provider])}>
              <Cpu size={12} /> {model}
            </Badge>
          )}
          {provider !== 'custom' && (
            <Badge variant="outline" className="gap-1.5 rounded-lg capitalize">
              <Zap size={12} /> {provider}
            </Badge>
          )}
          {metrics?.estimatedCostPer1k != null && (
            <Badge variant="secondary" className="gap-1.5 rounded-lg">
              <DollarSign size={12} /> ~${String(metrics.estimatedCostPer1k)}/call
            </Badge>
          )}
          {phase === 'done' && (
            <Badge variant="secondary" className="gap-1.5 rounded-lg text-muted-foreground">
              ~{Math.ceil(outputTokens.length / 4)} tokens
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {phase === 'idle' && 'Streams tokens in real-time. Falls back to mock data without API keys.'}
          {phase === 'done' && isMock && 'Mock response. Set the provider API key for live streaming.'}
          {phase === 'done' && !isMock && `Streamed live from ${provider} API.`}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Compare tab — Prompt A/B testing                                   */
/* ------------------------------------------------------------------ */

function computeLineDiff(a: string, b: string): Array<{ type: 'same' | 'added' | 'removed' | 'changed'; lineA?: string; lineB?: string }> {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const maxLen = Math.max(linesA.length, linesB.length);
  const diff: Array<{ type: 'same' | 'added' | 'removed' | 'changed'; lineA?: string; lineB?: string }> = [];
  for (let i = 0; i < maxLen; i++) {
    const la = linesA[i];
    const lb = linesB[i];
    if (la === lb) diff.push({ type: 'same' as const, lineA: la, lineB: lb });
    else if (la === undefined) diff.push({ type: 'added' as const, lineB: lb });
    else if (lb === undefined) diff.push({ type: 'removed' as const, lineA: la });
    else diff.push({ type: 'changed' as const, lineA: la, lineB: lb });
  }
  return diff;
}

const diffLineColors: Record<string, string> = {
  same: '',
  added: 'bg-emerald-500/10 text-emerald-400',
  removed: 'bg-red-500/10 text-red-400 line-through',
  changed: 'bg-amber-500/10 text-amber-400',
};

const diffIndicatorColors: Record<string, string> = {
  same: 'text-muted-foreground/30',
  added: 'text-emerald-500',
  removed: 'text-red-500',
  changed: 'text-amber-500',
};

function CompareTab({ agent }: { agent: Record<string, unknown> }) {
  const id = agent.id as string;
  const originalPrompt = (agent.prompt as string) ?? '';
  const inputSchema = agent.input as Record<string, unknown> | undefined;
  const model = agent.model as string | undefined;
  const provider = (agent.provider as string) ?? 'custom';

  const [modifiedPrompt, setModifiedPrompt] = useState(originalPrompt);
  const [testInput, setTestInput] = useState(
    JSON.stringify(inputSchema?.example ?? {}, null, 2)
  );
  const [resultA, setResultA] = useState<string | null>(null);
  const [resultB, setResultB] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [tokenCountA, setTokenCountA] = useState<number | null>(null);
  const [tokenCountB, setTokenCountB] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputCollapsed, setInputCollapsed] = useState(false);

  const diff = computeLineDiff(originalPrompt, modifiedPrompt);
  const hasChanges = diff.some((d) => d.type !== 'same');

  // Token estimates for prompts
  const promptTokensA = Math.ceil(originalPrompt.length / 4);
  const promptTokensB = Math.ceil(modifiedPrompt.length / 4);
  const tokenDiff = promptTokensB - promptTokensA;
  // Rough cost estimate: $0.003 per 1k tokens (mid-range)
  const costDiffPer1k = (tokenDiff * 0.003).toFixed(2);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setResultA(null);
    setResultB(null);
    setTokenCountA(null);
    setTokenCountB(null);
    setError(null);

    try {
      let parsedInput: unknown;
      try {
        parsedInput = JSON.parse(testInput);
      } catch {
        setError('Invalid JSON input. Please fix the input and try again.');
        setRunning(false);
        return;
      }

      const res = await fetch(`/api/agents/${encodeURIComponent(id)}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: parsedInput,
          promptA: originalPrompt,
          promptB: modifiedPrompt,
        }),
      });

      const data = await res.json();

      if (!res.ok && !data.outputA) {
        setError(data.error ?? `Request failed with status ${res.status}`);
        setRunning(false);
        return;
      }

      setResultA(typeof data.outputA === 'string' ? data.outputA : JSON.stringify(data.outputA, null, 2));
      setResultB(typeof data.outputB === 'string' ? data.outputB : JSON.stringify(data.outputB, null, 2));
      setTokenCountA(data.tokensA ?? null);
      setTokenCountB(data.tokensB ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setRunning(false);
    }
  }, [id, testInput, originalPrompt, modifiedPrompt]);

  // Compute output diff when both results are available
  const outputDiff = resultA != null && resultB != null ? computeLineDiff(resultA, resultB) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
          <X size={14} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs leading-relaxed text-red-400">{error}</p>
        </div>
      )}

      {/* ── Top: Test Input (collapsible) ── */}
      <Card className="border-border/40 bg-muted/20">
        <CardHeader className="pb-2">
          <button
            type="button"
            onClick={() => setInputCollapsed(!inputCollapsed)}
            className="flex w-full items-center justify-between"
          >
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clipboard size={14} className="text-muted-foreground" />
              Test Input
            </CardTitle>
            {inputCollapsed ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
          </button>
        </CardHeader>
        {!inputCollapsed && (
          <CardContent className="pt-0">
            <Textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="min-h-[100px] resize-none rounded-lg border-border/30 bg-background/80 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:border-ring"
              spellCheck={false}
              placeholder='{"key": "value"}'
            />
          </CardContent>
        )}
      </Card>

      {/* ── Middle: Prompt A vs B (side by side) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Original Prompt (read-only) */}
        <Card className="border-border/40 bg-muted/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileText size={14} className="text-muted-foreground" />
                Original Prompt (A)
              </CardTitle>
              <Badge variant="secondary" className="rounded-md text-[10px]">
                ~{promptTokensA.toLocaleString()} tokens
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/30 bg-muted/50 scrollbar-hide">
              <pre className="p-3 font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{originalPrompt || 'No prompt defined.'}</pre>
            </div>
          </CardContent>
        </Card>

        {/* Right: Modified Prompt (editable) */}
        <Card className="border-border/40 bg-muted/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Pencil size={14} className="text-muted-foreground" />
                Modified Prompt (B)
              </CardTitle>
              <Badge variant="secondary" className="rounded-md text-[10px]">
                ~{promptTokensB.toLocaleString()} tokens
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Textarea
              value={modifiedPrompt}
              onChange={(e) => setModifiedPrompt(e.target.value)}
              className="min-h-[300px] resize-y rounded-lg border-border/30 bg-background/80 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:border-ring"
              spellCheck={false}
              placeholder="Edit the prompt to compare..."
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Diff Indicator ── */}
      {hasChanges && (
        <Card className="border-border/40 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ArrowLeftRight size={14} className="text-muted-foreground" />
              Prompt Diff
              <Badge variant="secondary" className="rounded-md text-[10px]">
                {diff.filter((d) => d.type !== 'same').length} line{diff.filter((d) => d.type !== 'same').length !== 1 ? 's' : ''} changed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[240px] overflow-y-auto rounded-lg border border-border/30 bg-background/80 scrollbar-hide">
              <div className="p-2">
                {diff.map((line, i) => (
                  <div key={i} className={cn('flex gap-2 rounded px-2 py-0.5 font-mono text-xs', diffLineColors[line.type])}>
                    <span className={cn('w-4 shrink-0 text-right select-none', diffIndicatorColors[line.type])}>
                      {line.type === 'same' ? ' ' : line.type === 'added' ? '+' : line.type === 'removed' ? '-' : '~'}
                    </span>
                    <span className="whitespace-pre-wrap break-all">
                      {line.type === 'changed' ? (
                        <>
                          <span className="text-red-400/70 line-through">{line.lineA}</span>
                          {' '}
                          <span className="text-emerald-400">{line.lineB}</span>
                        </>
                      ) : (
                        line.lineA ?? line.lineB ?? ''
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Token diff summary + Run button ── */}
      <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Prompt A: <span className="font-medium text-foreground tabular-nums">~{promptTokensA.toLocaleString()} tokens</span></span>
          <span className="text-muted-foreground">Prompt B: <span className="font-medium text-foreground tabular-nums">~{promptTokensB.toLocaleString()} tokens</span></span>
          {tokenDiff !== 0 && (
            <span className={cn('font-medium tabular-nums', tokenDiff > 0 ? 'text-amber-400' : 'text-emerald-400')}>
              {tokenDiff > 0 ? '+' : ''}{tokenDiff.toLocaleString()} tokens ({tokenDiff > 0 ? '+' : ''}${costDiffPer1k}/1k runs)
            </span>
          )}
        </div>
        <Button
          onClick={handleRun}
          disabled={running || !originalPrompt}
          className="gap-2"
          size="sm"
        >
          {running ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
          {running ? 'Running A|B...' : 'Run A|B'}
        </Button>
      </div>

      {/* ── Bottom: Results A vs B (side by side) ── */}
      {(running || resultA != null || resultB != null) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Result A */}
          <Card className="border-border/40 bg-muted/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Code2 size={14} className="text-muted-foreground" />
                  Output A (Original)
                </CardTitle>
                {tokenCountA != null && (
                  <Badge variant="secondary" className="rounded-md text-[10px]">
                    ~{tokenCountA.toLocaleString()} tokens
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="min-h-[180px] rounded-lg border border-border/30 bg-background/80 p-3">
                {running ? (
                  <div className="flex h-full min-h-[156px] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={20} className="animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Running prompt A...</span>
                    </div>
                  </div>
                ) : resultA != null ? (
                  <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
                    <pre className="font-mono text-xs leading-relaxed text-emerald-400 whitespace-pre-wrap"><code>{resultA}</code></pre>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Result B */}
          <Card className="border-border/40 bg-muted/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Code2 size={14} className="text-muted-foreground" />
                  Output B (Modified)
                </CardTitle>
                {tokenCountB != null && (
                  <Badge variant="secondary" className="rounded-md text-[10px]">
                    ~{tokenCountB.toLocaleString()} tokens
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="min-h-[180px] rounded-lg border border-border/30 bg-background/80 p-3">
                {running ? (
                  <div className="flex h-full min-h-[156px] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={20} className="animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Running prompt B...</span>
                    </div>
                  </div>
                ) : resultB != null ? (
                  <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
                    <pre className="font-mono text-xs leading-relaxed text-violet-400 whitespace-pre-wrap"><code>{resultB}</code></pre>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Output Diff ── */}
      {outputDiff && outputDiff.some((d) => d.type !== 'same') && (
        <Card className="border-border/40 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ArrowLeftRight size={14} className="text-muted-foreground" />
              Output Diff
              <Badge variant="secondary" className="rounded-md text-[10px]">
                {outputDiff.filter((d) => d.type !== 'same').length} line{outputDiff.filter((d) => d.type !== 'same').length !== 1 ? 's' : ''} differ
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/30 bg-background/80 scrollbar-hide">
              <div className="p-2">
                {outputDiff.map((line, i) => (
                  <div key={i} className={cn('flex gap-2 rounded px-2 py-0.5 font-mono text-xs', diffLineColors[line.type])}>
                    <span className={cn('w-4 shrink-0 text-right select-none', diffIndicatorColors[line.type])}>
                      {line.type === 'same' ? ' ' : line.type === 'added' ? '+' : line.type === 'removed' ? '-' : '~'}
                    </span>
                    <span className="whitespace-pre-wrap break-all">
                      {line.type === 'changed' ? (
                        <>
                          <span className="text-red-400/70 line-through">{line.lineA}</span>
                          {' '}
                          <span className="text-emerald-400">{line.lineB}</span>
                        </>
                      ) : (
                        line.lineA ?? line.lineB ?? ''
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Bottom bar ── */}
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {model && (
            <Badge className={cn('gap-1.5 rounded-lg', providerColor[provider])}>
              <Cpu size={12} /> {model}
            </Badge>
          )}
          {provider !== 'custom' && (
            <Badge variant="outline" className="gap-1.5 rounded-lg capitalize">
              <Zap size={12} /> {provider}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          Edit the modified prompt, then click Run A|B to compare outputs side by side.
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit tab                                                           */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = ['active', 'experimental', 'deprecated', 'legacy'] as const;

function EditTab({ agent }: { agent: Record<string, unknown> }) {
  const id = agent.id as string;
  const config = agent.config as Record<string, unknown> | undefined;

  // Editable state — seeded from current agent data
  const [prompt, setPrompt] = useState((agent.prompt as string) ?? '');
  const [description, setDescription] = useState((agent.description as string) ?? '');
  const [status, setStatus] = useState((agent.status as string) ?? 'active');
  const [temperature, setTemperature] = useState<string>(
    config?.temperature != null ? String(config.temperature) : '',
  );
  const [maxTokens, setMaxTokens] = useState<string>(
    config?.maxTokens != null ? String(config.maxTokens) : '',
  );
  const [tags, setTags] = useState<string[]>((agent.tags as string[]) ?? []);
  const [newTag, setNewTag] = useState('');

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);

  const addTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);

    const body: Record<string, unknown> = {};

    // Only include fields that changed
    if (prompt !== ((agent.prompt as string) ?? '')) body.prompt = prompt;
    if (description !== ((agent.description as string) ?? '')) body.description = description;
    if (status !== ((agent.status as string) ?? 'active')) body.status = status;

    const origTags = (agent.tags as string[]) ?? [];
    if (JSON.stringify(tags) !== JSON.stringify(origTags)) body.tags = tags;

    // Config fields
    const configUpdates: Record<string, number> = {};
    const origTemp = config?.temperature != null ? String(config.temperature) : '';
    const origMax = config?.maxTokens != null ? String(config.maxTokens) : '';
    if (temperature !== origTemp && temperature !== '') {
      configUpdates.temperature = parseFloat(temperature);
    }
    if (maxTokens !== origMax && maxTokens !== '') {
      configUpdates.maxTokens = parseInt(maxTokens, 10);
    }
    if (Object.keys(configUpdates).length > 0) body.config = configUpdates;

    if (Object.keys(body).length === 0) {
      setSaveResult({ ok: true, message: 'No changes to save.' });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) {
        setSaveResult({ ok: false, message: json.error ?? `Error ${res.status}` });
      } else {
        setSaveResult({ ok: true, message: `Saved: ${(json.updated as string[]).join(', ')}` });
      }
    } catch (err) {
      setSaveResult({ ok: false, message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Prompt ── */}
      <section className="flex flex-col gap-2">
        <label className="flex items-center gap-1.5 text-sm font-semibold">
          <FileText size={14} className="text-muted-foreground" />
          Prompt
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[240px] resize-y rounded-lg border-border/30 bg-background/80 font-mono text-xs leading-relaxed"
          spellCheck={false}
          placeholder="System prompt for this agent..."
        />
      </section>

      <Separator />

      {/* ── Description ── */}
      <section className="flex flex-col gap-2">
        <label className="flex items-center gap-1.5 text-sm font-semibold">
          <FileText size={14} className="text-muted-foreground" />
          Description
        </label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border-border/30 bg-background/80"
          placeholder="Short agent description..."
        />
      </section>

      <Separator />

      {/* ── Config: temperature & maxTokens ── */}
      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Settings size={14} className="text-muted-foreground" />
          Configuration
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Temperature</label>
            <Input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="rounded-lg border-border/30 bg-background/80"
              placeholder="0.0 - 2.0"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Max Tokens</label>
            <Input
              type="number"
              min="1"
              step="100"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              className="rounded-lg border-border/30 bg-background/80"
              placeholder="e.g. 4000"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Status ── */}
      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Activity size={14} className="text-muted-foreground" />
          Status
        </h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt}
              variant={status === opt ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus(opt)}
              className={cn(
                'capitalize',
                status === opt ? statusColors[opt] : undefined,
              )}
            >
              {opt}
            </Button>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Tags ── */}
      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Layers size={14} className="text-muted-foreground" />
          Tags
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 rounded-lg pr-1 font-normal"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-muted-foreground/20"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
          <div className="flex items-center gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="h-7 w-28 rounded-lg border-border/30 bg-background/80 text-xs"
              placeholder="Add tag..."
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={addTag}
              disabled={!newTag.trim()}
            >
              <Plus size={12} />
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Save ── */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>

        {saveResult && (
          <div className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
            saveResult.ok
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-red-500/10 text-red-400',
          )}>
            {saveResult.ok ? <Check size={12} /> : <X size={12} />}
            {saveResult.message}
          </div>
        )}
      </div>

      {/* ── Source file path ── */}
      {Boolean(agent.sourceFile) && (
        <p className="text-[11px] text-muted-foreground">
          Source: {String(agent.sourceFile)}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stories tab                                                        */
/* ------------------------------------------------------------------ */

interface AssertionDef {
  field: string;
  operator: string;
  value: unknown;
}

interface StoryDef {
  name: string;
  description?: string;
  input: unknown;
  expectedOutput?: unknown;
  assertions?: AssertionDef[];
  tags?: string[];
}

interface StoryResult {
  status: 'passed' | 'failed' | 'running' | 'error';
  output?: unknown;
  assertionResults?: { field: string; operator: string; expected: unknown; actual: unknown; passed: boolean }[];
  expectedMatch?: boolean;
  errorMessage?: string;
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((o: unknown, k: string) => {
    if (o == null) return undefined;
    const match = k.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      const arr = (o as Record<string, unknown>)?.[match[1]];
      if (Array.isArray(arr)) return arr[parseInt(match[2])];
      return undefined;
    }
    return (o as Record<string, unknown>)?.[k];
  }, obj);
}

function checkAssertion(output: unknown, assertion: AssertionDef): boolean {
  const fieldValue = getNestedValue(output, assertion.field);
  switch (assertion.operator) {
    case 'equals': return JSON.stringify(fieldValue) === JSON.stringify(assertion.value);
    case 'gt': return (fieldValue as number) > (assertion.value as number);
    case 'lt': return (fieldValue as number) < (assertion.value as number);
    case 'gte': return (fieldValue as number) >= (assertion.value as number);
    case 'lte': return (fieldValue as number) <= (assertion.value as number);
    case 'contains': return String(fieldValue).includes(String(assertion.value));
    case 'exists': return fieldValue !== undefined && fieldValue !== null;
    case 'type': return typeof fieldValue === assertion.value;
    default: return false;
  }
}

const storyTagColors: Record<string, string> = {
  'happy-path': 'bg-emerald-500/15 text-emerald-400',
  'edge-case': 'bg-amber-500/15 text-amber-400',
  'stress': 'bg-red-500/15 text-red-400',
};

function StoriesTab({ agent }: { agent: Record<string, unknown> }) {
  const stories = ((agent.stories as StoryDef[]) ?? []);
  const id = agent.id as string;
  const [results, setResults] = useState<Record<number, StoryResult>>({});
  const [running, setRunning] = useState<number | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <BookOpen size={32} className="text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          No stories defined. Add a <code className="rounded bg-muted/50 px-1.5 py-0.5 text-xs font-mono">stories</code> array to your agent definition.
        </p>
      </div>
    );
  }

  const runStory = async (index: number) => {
    setRunning(index);
    setResults((prev) => ({ ...prev, [index]: { status: 'running' } }));

    try {
      const story = stories[index];
      const res = await fetch(`/api/agents/${encodeURIComponent(id)}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: story.input }),
      });

      const data = await res.json();

      if (!res.ok && !data.output) {
        setResults((prev) => ({
          ...prev,
          [index]: { status: 'error', errorMessage: data.error ?? `Request failed (${res.status})` },
        }));
        setRunning(null);
        return;
      }

      const output = data.output;

      // Evaluate assertions
      let assertionResults: StoryResult['assertionResults'];
      if (story.assertions && story.assertions.length > 0) {
        assertionResults = story.assertions.map((a) => ({
          field: a.field,
          operator: a.operator,
          expected: a.value,
          actual: getNestedValue(output, a.field),
          passed: checkAssertion(output, a),
        }));
      }

      // Evaluate expectedOutput
      let expectedMatch: boolean | undefined;
      if (story.expectedOutput !== undefined) {
        expectedMatch = JSON.stringify(output) === JSON.stringify(story.expectedOutput);
      }

      // Determine overall status
      const allAssertionsPassed = assertionResults ? assertionResults.every((r) => r.passed) : true;
      const expectedPassed = expectedMatch !== undefined ? expectedMatch : true;
      const status: StoryResult['status'] = allAssertionsPassed && expectedPassed ? 'passed' : 'failed';

      setResults((prev) => ({
        ...prev,
        [index]: { status, output, assertionResults, expectedMatch },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [index]: { status: 'error', errorMessage: err instanceof Error ? err.message : 'Network error' },
      }));
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    for (let i = 0; i < stories.length; i++) {
      await runStory(i);
    }
    setRunningAll(false);
  };

  // Summary counts
  const resultEntries = Object.values(results);
  const passedCount = resultEntries.filter((r) => r.status === 'passed').length;
  const failedCount = resultEntries.filter((r) => r.status === 'failed' || r.status === 'error').length;
  const totalRun = passedCount + failedCount;

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">{stories.length} {stories.length === 1 ? 'Story' : 'Stories'}</h3>
          {totalRun > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={12} /> {passedCount}
              </span>
              {failedCount > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle size={12} /> {failedCount}
                </span>
              )}
              <span className="text-muted-foreground">
                {passedCount}/{totalRun} passed
              </span>
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={runAll}
          disabled={runningAll || running !== null}
          className="gap-2"
        >
          {runningAll ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <PlayCircle size={14} />
          )}
          {runningAll ? 'Running...' : 'Run All'}
        </Button>
      </div>

      <Separator />

      {/* Story cards */}
      <ScrollArea className="max-h-[600px]">
        <div className="flex flex-col gap-3">
          {stories.map((story, i) => {
            const result = results[i];
            const isRunning = running === i;

            const borderColor = result
              ? result.status === 'passed'
                ? 'border-emerald-500/30'
                : result.status === 'failed'
                  ? 'border-red-500/30'
                  : result.status === 'error'
                    ? 'border-red-500/30'
                    : 'border-amber-500/30'
              : 'border-border/40';

            const bgColor = result
              ? result.status === 'passed'
                ? 'bg-emerald-500/5'
                : result.status === 'failed' || result.status === 'error'
                  ? 'bg-red-500/5'
                  : 'bg-amber-500/5'
              : 'bg-muted/20';

            return (
              <Card key={i} className={cn('border', borderColor, bgColor)}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        {result && result.status === 'passed' && <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />}
                        {result && (result.status === 'failed' || result.status === 'error') && <XCircle size={14} className="shrink-0 text-red-400" />}
                        {isRunning && <Loader2 size={14} className="shrink-0 animate-spin text-amber-400" />}
                        <span className="text-sm font-semibold">{story.name}</span>
                      </div>
                      {story.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{story.description}</p>
                      )}
                      {story.tags && story.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {story.tags.map((tag) => (
                            <Badge
                              key={tag}
                              className={cn(
                                'rounded-md px-1.5 py-0 text-[10px] font-medium',
                                storyTagColors[tag] ?? 'bg-muted text-muted-foreground',
                              )}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runStory(i)}
                      disabled={isRunning || runningAll}
                      className="shrink-0 gap-1.5"
                    >
                      {isRunning ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Play size={12} />
                      )}
                      Run
                    </Button>
                  </div>
                </CardHeader>

                {/* Results section */}
                {result && result.status !== 'running' && (
                  <CardContent className="px-4 pb-3 pt-0">
                    <Separator className="mb-3" />

                    {/* Error message */}
                    {result.status === 'error' && result.errorMessage && (
                      <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                        <X size={12} className="mt-0.5 shrink-0 text-red-400" />
                        <p className="text-xs text-red-400">{result.errorMessage}</p>
                      </div>
                    )}

                    {/* Assertion results */}
                    {result.assertionResults && result.assertionResults.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Assertions</span>
                        <div className="flex flex-col gap-1">
                          {result.assertionResults.map((ar, j) => (
                            <div
                              key={j}
                              className={cn(
                                'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-mono',
                                ar.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
                              )}
                            >
                              {ar.passed ? <Check size={10} className="shrink-0" /> : <X size={10} className="shrink-0" />}
                              <span className="truncate">
                                {ar.field} {ar.operator} {JSON.stringify(ar.expected)}
                              </span>
                              {!ar.passed && (
                                <span className="ml-auto shrink-0 text-[10px] opacity-70">
                                  got: {JSON.stringify(ar.actual)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expected output comparison */}
                    {result.expectedMatch !== undefined && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Expected Output</span>
                        <div className={cn(
                          'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs',
                          result.expectedMatch ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
                        )}>
                          {result.expectedMatch ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {result.expectedMatch ? 'Output matches expected' : 'Output does not match expected'}
                        </div>
                      </div>
                    )}

                    {/* Raw output (show when no assertions and no expectedOutput) */}
                    {!result.assertionResults && result.expectedMatch === undefined && result.output !== undefined && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Output</span>
                        <div className="max-h-40 overflow-y-auto rounded-lg bg-muted/50 scrollbar-hide">
                          <pre className="p-3 text-xs leading-relaxed text-muted-foreground font-mono">
                            <code>{typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2)}</code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function Empty({ msg }: { msg: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{msg}</p>;
}
