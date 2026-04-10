import Link from 'next/link';
import { BarChart3, Bot, GitBranch, Globe, LayoutGrid } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface ShellProps {
  children: React.ReactNode;
  agentCount: number;
}

const NAV_ITEMS = [
  { href: '/', icon: LayoutGrid, label: 'Catalog' },
  { href: '/pipeline/episode-processing', icon: GitBranch, label: 'Pipeline' },
  { href: '/immersive', icon: Globe, label: 'Immersive' },
  { href: '/telemetry', icon: BarChart3, label: 'Insights' },
] as const;

export function Shell({ children, agentCount }: ShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40',
          'flex h-screen w-[72px] flex-col items-center px-2 py-5'
        )}
      >
        <div
          className={cn(
            'flex h-full w-full flex-col items-center gap-6 rounded-3xl py-5',
            'bg-sidebar/60 backdrop-blur-3xl border border-sidebar-border'
          )}
        >
          {/* Logo */}
          <Button
            variant="default"
            size="icon"
            className={cn(
              'h-10 w-10 rounded-xl font-display text-lg font-bold',
              'transition-all hover:scale-105',
              'hover:shadow-[0_0_16px_rgba(255,255,255,0.25)]',
              'active:scale-95'
            )}
            nativeButton={false}
            render={<Link href="/" />}
          >
            A
          </Button>

          <Separator className="w-8" />

          {/* Navigation */}
          <nav className="flex flex-col items-center gap-3">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
              <Tooltip key={href}>
                <TooltipTrigger
                  render={
                    <Link
                      href={href}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        'text-muted-foreground transition-all',
                        'hover:bg-muted hover:text-foreground'
                      )}
                    />
                  }
                >
                  <Icon size={20} />
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {label}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Agent count */}
          <div className="flex flex-col items-center gap-1.5">
            <Bot size={16} className="text-muted-foreground" />
            <Badge variant="secondary" className="tabular-nums">
              {agentCount}
            </Badge>
          </div>

          {/* Branding */}
          <span
            className="select-none text-[8px] font-medium tracking-[0.3em] text-muted-foreground/40"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            ARCHON
          </span>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="ml-[72px] flex-1 overflow-y-auto scrollbar-hide">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
