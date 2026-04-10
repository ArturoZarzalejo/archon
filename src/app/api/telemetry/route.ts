import { NextResponse } from 'next/server';
import { getRegistry } from '@/lib/registry';
import { collectTelemetry } from '@/lib/telemetry';

export async function GET() {
  const registry = await getRegistry();
  const telemetry = collectTelemetry(registry);
  return NextResponse.json(telemetry);
}
