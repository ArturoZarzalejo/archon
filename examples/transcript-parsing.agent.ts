import { defineAgent } from '../src/index.js';
import { z } from 'zod';

export default defineAgent({
  id: 'transcript-parsing',
  name: 'Transcript Parser',
  description: 'Parses Whisper output into structured data with timestamps, word count, and segmented text. Pure data transformation — no AI required.',
  version: '1.0.0',
  module: 'episodes',

  config: {
    maxTokens: 0,
  },

  input: {
    description: 'Raw Whisper API output with segments and duration',
    schema: z.object({
      segments: z.array(z.object({
        start: z.number(),
        text: z.string(),
      })),
      duration: z.number(),
    }),
    example: {
      segments: [
        { start: 0, text: 'Bienvenidos al podcast de hoy.' },
        { start: 4.5, text: 'Vamos a hablar sobre inteligencia artificial.' },
        { start: 8.2, text: 'Nuestro invitado es un experto en LLMs.' },
      ],
      duration: 3600,
    },
  },

  output: {
    description: 'Structured transcript with full text, timestamps, and metadata',
    schema: z.object({
      fullText: z.string(),
      textWithTimestamps: z.string(),
      duration: z.number(),
      segmentCount: z.number(),
      wordCount: z.number(),
    }),
    example: {
      fullText: 'Bienvenidos al podcast de hoy. Vamos a hablar sobre inteligencia artificial...',
      textWithTimestamps: '[0:00] Bienvenidos al podcast de hoy.\n[0:04] Vamos a hablar sobre inteligencia artificial.',
      duration: 3600,
      segmentCount: 3,
      wordCount: 18,
    },
  },

  feeds: ['hook-detection', 'gpt-analysis'],
  tags: ['transcription', 'parsing', 'whisper'],
  status: 'active',
  author: 'vision-team',
});
