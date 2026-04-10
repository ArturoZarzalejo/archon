import { defineConfig } from './src/index.js';

export default defineConfig({
  include: ['examples/**/*.agent.ts'],
  pipelines: [
    {
      id: 'episode-processing',
      name: 'Episode Processing Pipeline',
      description: 'Complete pipeline from raw audio to published YouTube content',
      stages: [
        'transcript-parsing',
        'hook-detection',
        'gpt-analysis',
        'thumbnail-pipeline',
      ],
    },
  ],
  ui: {
    title: 'Vision Agents',
    port: 6006,
  },
});
