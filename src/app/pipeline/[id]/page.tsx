import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRegistry } from '@/lib/registry';
import { Shell } from '@/components/layout/Shell';
import { PipelineGraph } from '@/components/pipeline/PipelineGraph';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const registry = await getRegistry();
  const pipeline = registry.getPipeline(id);
  return {
    title: pipeline ? `${pipeline.name} — Archon` : 'Pipeline Not Found — Archon',
    description: pipeline?.description ?? 'Agent pipeline visualization',
  };
}

export default async function PipelinePage({ params }: Props) {
  const { id } = await params;
  const registry = await getRegistry();
  const pipeline = registry.getPipeline(id);

  if (!pipeline) notFound();

  const allAgents = registry.getAllSerializable();

  // Filter agents that participate in this pipeline
  const pipelineAgents = allAgents.filter((a) =>
    pipeline.stages.includes(a.id as string),
  );

  return (
    <Shell agentCount={allAgents.length}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">
            {pipeline.name}
          </h1>
          {pipeline.description && (
            <p className="mt-1 text-sm text-text-secondary">
              {pipeline.description}
            </p>
          )}
        </div>
        <PipelineGraph agents={pipelineAgents} pipeline={pipeline} />
      </div>
    </Shell>
  );
}
