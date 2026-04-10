'use client';

import { useState, useMemo } from 'react';
import { Bot, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AgentCard } from './AgentCard';

interface CatalogGridProps {
  agents: Record<string, unknown>[];
}

export function CatalogGrid({ agents }: CatalogGridProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return agents;
    const terms = query.toLowerCase().split(/\s+/);
    return agents.filter((a) => {
      const searchable = [
        a.name as string,
        a.description as string,
        a.module as string,
        a.model as string,
        ...((a.tags as string[]) ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return terms.every((t) => searchable.includes(t));
    });
  }, [agents, query]);

  return (
    <>
      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder="Search agents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 rounded-xl pl-9 pr-4"
          />
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {filtered.length}
        </Badge>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
          <Bot size={40} strokeWidth={1.5} />
          <p className="text-sm">
            {query
              ? `No agents match "${query}"`
              : 'No agents found. Add .agent.ts files to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filtered.map((agent, i) => (
            <AgentCard key={agent.id as string} agent={agent} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
