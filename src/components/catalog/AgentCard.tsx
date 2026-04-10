'use client';

import Link from 'next/link';
import { Cpu, GitBranch, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: Record<string, unknown>;
  index: number;
}

const providerColor: Record<string, string> = {
  openai: 'bg-openai/15 text-openai border-openai/20',
  anthropic: 'bg-anthropic/15 text-anthropic border-anthropic/20',
  google: 'bg-google/15 text-google border-google/20',
  custom: 'bg-surface-overlay text-text-secondary border-transparent',
};

const providerDot: Record<string, string> = {
  openai: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
  anthropic: 'bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.5)]',
  google: 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]',
  custom: 'bg-zinc-500',
};

const statusVariant: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/20',
  experimental: 'bg-warning/15 text-warning border-warning/20',
  deprecated: 'bg-danger/15 text-danger border-danger/20',
  legacy: 'bg-surface-overlay text-text-muted border-transparent',
};

export function AgentCard({ agent, index }: AgentCardProps) {
  const id = agent.id as string;
  const name = agent.name as string;
  const description = agent.description as string;
  const model = agent.model as string | undefined;
  const provider = (agent.provider as string) ?? 'custom';
  const status = (agent.status as string) ?? 'active';
  const module_ = agent.module as string | undefined;
  const dependsOn = (agent.dependsOn as string[]) ?? [];
  const feeds = (agent.feeds as string[]) ?? [];
  const depCount = dependsOn.length + feeds.length;

  return (
    <Link href={`/agent/${id}`} className="block">
      <Card
        className={cn(
          'glass glass-highlight glass-interactive tvos-card',
          'relative cursor-pointer border-0 bg-transparent p-0 ring-0',
          'animate-fade-in-up',
        )}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {/* Gradient border glow on hover */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
          style={{
            background:
              'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.10), rgba(244,63,94,0.08))',
          }}
        />
        <div className="pointer-events-none absolute inset-[1px] rounded-[11px] bg-surface-raised/80 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

        <CardHeader className="relative z-10 gap-0 px-5 pt-5 pb-0">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="font-display truncate text-base font-semibold text-text">
              {name}
            </CardTitle>
            <div className="mt-0.5 flex flex-shrink-0 items-center gap-2">
              <span
                className={cn('inline-block h-2 w-2 rounded-full', providerDot[provider])}
                title={provider}
              />
              <ChevronRight size={16} className="text-text-muted" />
            </div>
          </div>
          <CardDescription className="mt-1 leading-relaxed text-text-secondary line-clamp-2">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 px-5 pt-3 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            {model && (
              <Badge
                variant="outline"
                className={cn(
                  'h-auto gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium',
                  providerColor[provider],
                )}
              >
                <Cpu size={12} />
                {model}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                'h-auto rounded-lg px-2 py-0.5 text-[11px] font-medium',
                statusVariant[status],
              )}
            >
              {status}
            </Badge>
            {module_ && (
              <Badge
                variant="secondary"
                className="h-auto rounded-lg bg-surface-overlay/60 px-2 py-0.5 text-[11px] font-medium text-text-muted"
              >
                {module_}
              </Badge>
            )}
            {depCount > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-text-muted">
                <GitBranch size={12} />
                {depCount}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
