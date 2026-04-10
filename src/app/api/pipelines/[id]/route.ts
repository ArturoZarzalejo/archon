import { NextResponse } from 'next/server';
import { getRegistry } from '@/lib/registry';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const registry = await getRegistry();
  const pipeline = registry.getPipeline(id);

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
  }

  return NextResponse.json(pipeline);
}
