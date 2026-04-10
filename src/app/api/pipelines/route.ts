import { NextResponse } from 'next/server';
import { getRegistry } from '@/lib/registry';

export async function GET() {
  const registry = await getRegistry();
  return NextResponse.json(registry.getPipelines());
}
