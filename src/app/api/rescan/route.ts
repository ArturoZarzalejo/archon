import { NextResponse } from 'next/server';
import { invalidateRegistry, getRegistry } from '@/lib/registry';

export async function POST() {
  invalidateRegistry();
  const registry = await getRegistry();
  return NextResponse.json({
    agents: registry.getAll().length,
    pipelines: registry.getPipelines().length,
    rescannedAt: new Date().toISOString(),
  });
}
