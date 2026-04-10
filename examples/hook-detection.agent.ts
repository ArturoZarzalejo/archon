import { defineAgent } from '../src/index.js';
import { z } from 'zod';

export default defineAgent({
  id: 'hook-detection',
  name: 'Hook Detection',
  description: 'Detects high-retention viral hooks in the transcript BEFORE chapter generation. Uses low reasoning effort for fast extraction of controversy, revelations, bold claims, and emotional moments.',
  version: '2.0.0',
  module: 'episodes',

  model: 'gpt-5.2',
  provider: 'openai',
  config: {
    reasoning: { effort: 'low' },
    maxTokens: 3000,
    temperature: 0.3,
  },

  input: {
    description: 'Parsed transcript with timestamps',
    schema: z.object({
      textWithTimestamps: z.string(),
      duration: z.number(),
    }),
    example: {
      textWithTimestamps: '[0:00] Bienvenidos al podcast...\n[2:30] Lo que nadie sabe es que...\n[5:15] Esto va a cambiar todo...',
      duration: 3600,
    },
  },

  output: {
    description: 'Array of detected hooks with viral scores and chapter suggestions',
    schema: z.object({
      hooks: z.array(z.object({
        timestamp: z.string(),
        quote: z.string(),
        hook_type: z.enum(['revelation', 'controversy', 'question', 'bold_claim', 'emotional']),
        strength: z.number().min(1).max(10),
        suggested_chapter_start: z.boolean(),
        evidence_confidence: z.enum(['low', 'medium', 'high']).optional(),
      })),
    }),
    example: {
      hooks: [
        {
          timestamp: '2:30',
          quote: 'Lo que nadie sabe es que las grandes tech companies ya tienen AGI funcionando internamente.',
          hook_type: 'revelation',
          strength: 9,
          suggested_chapter_start: true,
          evidence_confidence: 'high',
        },
        {
          timestamp: '5:15',
          quote: 'Esto va a cambiar completamente como entendemos la programación.',
          hook_type: 'bold_claim',
          strength: 7,
          suggested_chapter_start: false,
          evidence_confidence: 'medium',
        },
      ],
    },
  },

  prompt: `<role>
You are a VIRAL CONTENT ANALYST specialized in YouTube retention optimization.
Your job is to identify the most compelling, shareable, and retention-driving moments in podcast transcripts.
</role>

<task>
Analyze the transcript and extract HIGH-RETENTION HOOKS — moments that would make a viewer stop scrolling.
For each hook, identify the type, quote the exact text, and rate its viral potential.
</task>

<hook_type_definitions>
- revelation: Hidden truth or insider knowledge being exposed
- controversy: Polarizing opinion or provocative statement
- question: Thought-provoking question that demands an answer
- bold_claim: Audacious prediction or strong assertion
- emotional: Raw emotional moment (vulnerability, anger, joy)
</hook_type_definitions>`,

  dependsOn: ['transcript-parsing'],
  feeds: ['gpt-analysis'],
  tags: ['viral', 'hooks', 'retention', 'youtube'],
  status: 'active',
  author: 'vision-team',
});
