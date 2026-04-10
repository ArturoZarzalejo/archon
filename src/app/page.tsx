import type { Metadata } from 'next';
import { getRegistry } from '@/lib/registry';
import { Shell } from '@/components/layout/Shell';
import { CatalogGrid } from '@/components/catalog/CatalogGrid';

export const metadata: Metadata = {
  title: 'Agent Catalog — Archon',
  description: 'Browse all AI agents in your project',
};

export default async function CatalogPage() {
  const registry = await getRegistry();
  const agents = registry.getAllSerializable();

  return (
    <Shell agentCount={agents.length}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Agent Catalog</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {agents.length} agent{agents.length !== 1 ? 's' : ''} discovered
          </p>
        </div>
        <CatalogGrid agents={agents} />
      </div>
    </Shell>
  );
}
