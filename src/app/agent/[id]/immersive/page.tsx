import { notFound } from 'next/navigation';
import { getRegistry } from '@/lib/registry';
import AgentImmersiveView from '@/components/immersive/AgentImmersiveView';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AgentImmersivePage({ params }: Props) {
  const { id } = await params;
  const registry = await getRegistry();
  const agent = registry.getSerializable(id);

  if (!agent) notFound();

  // Get connected agents for context
  const allAgents = registry.getAllSerializable();
  const dependsOn = (agent.dependsOn as string[]) ?? [];
  const feeds = (agent.feeds as string[]) ?? [];
  const connectedIds = new Set([...dependsOn, ...feeds]);
  const connectedAgents = allAgents.filter(a => connectedIds.has(a.id as string));

  return (
    <AgentImmersiveView
      agent={agent}
      connectedAgents={connectedAgents}
    />
  );
}
