import { z } from 'zod';

export const PipelineDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  stages: z.array(z.string()),
  triggers: z.array(z.string()).optional(),
  schedule: z.string().optional(),
  timeout: z.number().optional(),
});

export type PipelineDefinition = z.infer<typeof PipelineDefinitionSchema>;

export function definePipeline(config: PipelineDefinition): PipelineDefinition {
  return PipelineDefinitionSchema.parse(config);
}
