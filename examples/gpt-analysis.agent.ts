import { defineAgent } from '../src/index.js';
import { z } from 'zod';

export default defineAgent({
  id: 'gpt-analysis',
  name: 'GPT Deep Analysis',
  description: '2-Call GPT pipeline with Chain of Thought. Call 1: deep analysis with medium reasoning (enriched transcript). Call 2: formatting with no reasoning (final metadata). Uses previous_response_id to preserve CoT context.',
  version: '3.0.0',
  module: 'episodes',

  model: 'gpt-5.2',
  provider: 'openai',
  config: {
    reasoning: { effort: 'medium' },
    maxTokens: 8000,
    temperature: 0.4,
  },

  input: {
    description: 'Parsed transcript + detected hooks for context-aware analysis',
    schema: z.object({
      fullText: z.string(),
      textWithTimestamps: z.string(),
      hooks: z.array(z.object({
        timestamp: z.string(),
        quote: z.string(),
        hook_type: z.string(),
        strength: z.number(),
      })),
      duration: z.number(),
    }),
    example: {
      fullText: 'Full podcast transcript text...',
      textWithTimestamps: '[0:00] Bienvenidos...',
      hooks: [{ timestamp: '2:30', quote: 'Lo que nadie sabe...', hook_type: 'revelation', strength: 9 }],
      duration: 3600,
    },
  },

  output: {
    description: 'Complete podcast metadata: guest info, chapters, titles, tags, descriptions',
    schema: z.object({
      guest: z.object({ name: z.string(), role: z.string() }).optional(),
      topic: z.string(),
      chapters: z.array(z.object({
        title: z.string(),
        start: z.string(),
        summary: z.string(),
      })),
      titles: z.array(z.string()),
      tags: z.array(z.string()),
      description: z.string(),
    }),
    example: {
      guest: { name: 'Dr. Elena Torres', role: 'AI Research Lead at DeepMind' },
      topic: 'The hidden reality of AGI development in big tech',
      chapters: [
        { title: 'El estado real de la AGI', start: '0:00', summary: 'Introduction and context setting' },
        { title: 'Lo que las big tech no quieren que sepas', start: '2:30', summary: 'Revelation about internal AGI capabilities' },
      ],
      titles: [
        'Las Big Tech YA tienen AGI (y no lo saben)',
        'La verdad sobre AGI que nadie se atreve a contar',
      ],
      tags: ['agi', 'inteligencia-artificial', 'big-tech', 'deepmind'],
      description: 'En este episodio, la Dra. Elena Torres revela...',
    },
  },

  prompt: `<role>
You are an EXPERT PODCAST ANALYST with deep knowledge of YouTube SEO, viral content, and audience retention.
You will analyze a podcast transcript in TWO phases:
Phase 1: Deep analysis with Chain of Thought reasoning
Phase 2: Structured formatting of the analysis results
</role>

<output_verbosity_spec>
ALWAYS return valid JSON. No markdown. No explanations outside the JSON structure.
</output_verbosity_spec>`,

  dependsOn: ['transcript-parsing', 'hook-detection'],
  feeds: ['thumbnail-pipeline', 'trend-titles', 'viral-clips'],
  tags: ['analysis', 'metadata', 'chapters', 'seo', 'youtube'],
  status: 'active',
  author: 'vision-team',
  metrics: {
    avgTokensIn: 12000,
    avgTokensOut: 3500,
    avgLatencyMs: 8500,
    estimatedCostPer1k: 0.45,
    successRate: 0.97,
  },
});
