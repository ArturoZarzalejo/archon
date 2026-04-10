import { getRegistry } from '@/lib/registry';
import ImmersiveView from '@/components/immersive/ImmersiveView';

export default async function ImmersivePage() {
  const registry = await getRegistry();
  const agents = registry.getAllSerializable();

  return <ImmersiveView agentCount={agents.length} />;
}
