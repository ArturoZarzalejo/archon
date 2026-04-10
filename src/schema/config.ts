import { z } from 'zod';
import { PipelineDefinitionSchema } from './pipeline';

export const ArchonConfigSchema = z.object({
  include: z.array(z.string()).default(['src/**/*.agent.ts', 'agents/**/*.agent.ts']),
  markdown: z.object({
    enabled: z.boolean().default(true),
    paths: z.array(z.string()).default(['.agents/**/*.md']),
  }).optional(),
  pipelines: z.array(PipelineDefinitionSchema).optional(),
  ui: z.object({
    title: z.string().optional().default('Archon'),
    port: z.number().optional().default(6006),
    immersive: z.boolean().optional().default(false),
  }).optional(),
  telemetry: z.object({
    enabled: z.boolean().optional().default(false),
    anonymous: z.boolean().optional().default(true),
    endpoint: z.string().url().optional(),
  }).optional(),
});

export type ArchonConfig = z.infer<typeof ArchonConfigSchema>;

/** Accepts any partial config — Zod fills in defaults */
export function defineConfig(config: Record<string, unknown>): ArchonConfig {
  return ArchonConfigSchema.parse(config);
}
