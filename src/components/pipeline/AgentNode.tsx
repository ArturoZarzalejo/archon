'use client';

import { Handle, Position } from '@xyflow/react';
import { Cpu } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#22c55e',
  anthropic: '#a855f7',
  google: '#3b82f6',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  experimental: 'bg-amber-500/15 text-amber-400',
  deprecated: 'bg-red-500/15 text-red-400',
};

interface AgentNodeData {
  agent?: Record<string, unknown>;
  stageId: string;
  [key: string]: unknown;
}

export function AgentNode({ data }: { data: AgentNodeData }) {
  const agent = data.agent;
  const provider = (agent?.provider as string) || '';
  const handleColor = PROVIDER_COLORS[provider] || 'rgba(255,255,255,0.3)';
  const status = (agent?.status as string) || '';
  const model = agent?.model as string | undefined;

  if (!agent) {
    return (
      <div className="w-[220px]">
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: 10,
            height: 10,
            background: 'rgba(255,255,255,0.3)',
            border: 'none',
          }}
        />
        <GlassPanel variant="highlight" rounded="xl" padding="sm">
          <p className="text-xs text-text-muted text-center font-mono">
            {data.stageId}
          </p>
        </GlassPanel>
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: 10,
            height: 10,
            background: 'rgba(255,255,255,0.3)',
            border: 'none',
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-[220px] tvos-card">
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 10,
          height: 10,
          background: handleColor,
          border: 'none',
        }}
      />
      <GlassPanel variant="highlight" rounded="xl" padding="sm">
        <div className="flex flex-col gap-2">
          {/* Name */}
          <p className="font-display font-bold text-sm text-text leading-tight">
            {agent.name as string}
          </p>

          {/* Model badge */}
          {model && (
            <div className="flex items-center gap-1.5">
              <Cpu size={12} style={{ color: handleColor }} />
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${handleColor}15`,
                  color: handleColor,
                }}
              >
                {model}
              </span>
            </div>
          )}

          {/* Status badge */}
          {status && (
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit ${STATUS_STYLES[status] || 'bg-surface-hover text-text-muted'}`}
            >
              {status}
            </span>
          )}
        </div>
      </GlassPanel>
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          background: handleColor,
          border: 'none',
        }}
      />
    </div>
  );
}
