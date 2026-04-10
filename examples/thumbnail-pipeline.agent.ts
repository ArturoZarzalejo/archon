import { defineAgent } from '../src/index.js';
import { z } from 'zod';

export default defineAgent({
  id: 'thumbnail-pipeline',
  name: 'Thumbnail Pipeline',
  description: 'Generates viral YouTube thumbnails using Gemini image generation. Takes chapter context from GPT analysis and creates hook-driven thumbnails with face preservation, semantic inpainting, and brand-safe text overlays.',
  version: '1.5.0',
  module: 'episodes',

  model: 'gemini-2.0-flash-exp',
  provider: 'google',
  config: {
    temperature: 0.8,
    maxTokens: 4096,
  },

  input: {
    description: 'Chapter context with visual cues, extracted from GPT analysis',
    schema: z.object({
      chapterTitle: z.string(),
      summary: z.string(),
      hookQuote: z.string().optional(),
      guestName: z.string().optional(),
      visualMood: z.enum(['dramatic', 'energetic', 'mysterious', 'warm', 'confrontational']).optional(),
    }),
    example: {
      chapterTitle: 'Lo que las big tech no quieren que sepas',
      summary: 'Revelation about internal AGI capabilities at major tech companies',
      hookQuote: 'Las grandes tech companies ya tienen AGI funcionando internamente',
      guestName: 'Dr. Elena Torres',
      visualMood: 'dramatic',
    },
  },

  output: {
    description: 'Generated thumbnail image URL with metadata',
    schema: z.object({
      imageUrl: z.string(),
      width: z.number(),
      height: z.number(),
      textOverlay: z.string().optional(),
      hookType: z.string(),
    }),
    example: {
      imageUrl: 'https://storage.example.com/thumbnails/abc123.png',
      width: 1920,
      height: 1080,
      textOverlay: 'YA TIENEN AGI',
      hookType: 'revelation',
    },
  },

  prompt: `<face_preservation_rules>
CRITICAL: NEVER modify, distort, or reimagine faces. Preserve all facial features exactly.
Only modify backgrounds, lighting, and text overlays.
</face_preservation_rules>

<structure>
1. Background: cinematic gradient matching visual mood
2. Rim lighting: 3-point system emphasizing the subject
3. Text overlay: 1-3 words, maximum impact, brand-safe
4. Color grading: YouTube-optimized contrast and saturation
</structure>

<output_format>
16:9 aspect ratio, 2K resolution (1920x1080 minimum)
</output_format>`,

  dependsOn: ['gpt-analysis'],
  feeds: ['thumbnail-variants'],
  tools: ['gemini-image-generation', 'background-removal'],
  tags: ['thumbnails', 'image-generation', 'gemini', 'visual'],
  status: 'active',
  author: 'vision-team',
  metrics: {
    avgTokensIn: 500,
    avgTokensOut: 2000,
    avgLatencyMs: 12000,
    estimatedCostPer1k: 0.12,
    successRate: 0.91,
  },
});
