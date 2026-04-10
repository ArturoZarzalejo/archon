import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRegistry } from '@/lib/registry';
import { Shell } from '@/components/layout/Shell';
import { AgentDetail } from '@/components/detail/AgentDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const registry = await getRegistry();
  const agent = registry.getSerializable(id);

  if (!agent) {
    return { title: 'Agent Not Found — Archon' };
  }

  const name = agent.name as string;
  const description = agent.description as string;
  const model = agent.model as string | undefined;
  const provider = agent.provider as string | undefined;

  return {
    title: `${name} — Archon`,
    description: description,
    openGraph: {
      title: `${name} — Archon Agent Viewer`,
      description: `${description}${model ? ` | Model: ${model}` : ''}${provider ? ` | Provider: ${provider}` : ''}`,
    },
  };
}

export default async function AgentPage({ params, searchParams }: Props & { searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const registry = await getRegistry();
  const agent = registry.getSerializable(id);

  if (!agent) notFound();

  return (
    <Shell agentCount={registry.getAll().length}>
      <AgentDetail
        agent={agent}
        initialView={sp.view === 'immersive' ? 'immersive' : 'detail'}
        initialTab={sp.tab}
      />
    </Shell>
  );
}
