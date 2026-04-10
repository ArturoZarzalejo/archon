import { getRegistry } from '@/lib/registry';
import { collectTelemetry, isTelemetryEnabled } from '@/lib/telemetry';
import { Shell } from '@/components/layout/Shell';
import { TelemetryDashboard } from '@/components/telemetry/TelemetryDashboard';

export default async function TelemetryPage() {
  const registry = await getRegistry();
  const agents = registry.getAllSerializable();
  const telemetry = collectTelemetry(registry);
  const telemetryEnabled = await isTelemetryEnabled();

  return (
    <Shell agentCount={agents.length}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">
            Insights
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Anonymous telemetry snapshot of your agent architecture
          </p>
        </div>
        <TelemetryDashboard
          telemetry={telemetry}
          telemetryEnabled={telemetryEnabled}
        />
      </div>
    </Shell>
  );
}
