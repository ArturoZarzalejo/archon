import { NextResponse } from 'next/server';
import { getRegistry } from '@/lib/registry';
import { analyzeAgent, calculateHealthScore } from '@/lib/analyzer';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const registry = await getRegistry();
  const agent = registry.getSerializable(id);

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const recommendations = analyzeAgent(agent);
  const healthScore = calculateHealthScore(recommendations);

  return NextResponse.json({
    agentId: id,
    healthScore,
    total: recommendations.length,
    bySeverity: {
      critical: recommendations.filter((r) => r.severity === 'critical').length,
      warning: recommendations.filter((r) => r.severity === 'warning').length,
      info: recommendations.filter((r) => r.severity === 'info').length,
      tip: recommendations.filter((r) => r.severity === 'tip').length,
    },
    recommendations,
  });
}
