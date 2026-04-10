/**
 * Mock agents based on Vision Manager's episode processing pipeline.
 * Used for UI development without needing real *.agent.ts files.
 */

export const MOCK_AGENTS = [
  {
    id: 'transcript-parsing',
    name: 'Transcript Parser',
    description: 'Parses Whisper output into structured data with timestamps, word count, and segmented text. Pure data transformation — no AI required.',
    version: '1.0.0',
    module: 'episodes',
    status: 'active',
    tags: ['transcription', 'parsing', 'whisper'],
    author: 'vision-team',
    feeds: ['hook-detection', 'gpt-analysis'],
    config: { maxTokens: 0 },
    stories: [
      {
        name: 'Normal Whisper output',
        description: 'Three segments from Whisper API. Expects correct word count and segment count.',
        input: {
          segments: [
            { start: 0, text: 'Bienvenidos al podcast de hoy.' },
            { start: 4.5, text: 'Vamos a hablar sobre inteligencia artificial.' },
            { start: 8.2, text: 'Nuestro invitado es un experto en LLMs.' },
          ],
          duration: 3600,
        },
        expectedOutput: {
          fullText: 'Bienvenidos al podcast de hoy. Vamos a hablar sobre inteligencia artificial. Nuestro invitado es un experto en LLMs.',
          segmentCount: 3,
          wordCount: 18,
          duration: 3600,
        },
        assertions: [
          { field: 'segmentCount', operator: 'equals' as const, value: 3 },
          { field: 'wordCount', operator: 'equals' as const, value: 18 },
          { field: 'fullText', operator: 'contains' as const, value: 'inteligencia artificial' },
        ],
        tags: ['happy-path'],
      },
      {
        name: 'Single word segment',
        description: 'Edge case with a single segment containing one word.',
        input: {
          segments: [
            { start: 0, text: 'Hola.' },
          ],
          duration: 2,
        },
        assertions: [
          { field: 'segmentCount', operator: 'equals' as const, value: 1 },
          { field: 'wordCount', operator: 'equals' as const, value: 1 },
          { field: 'fullText', operator: 'equals' as const, value: 'Hola.' },
        ],
        tags: ['edge-case'],
      },
    ],
    input: {
      description: 'Raw Whisper API output with segments and duration',
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
      example: {
        fullText: 'Bienvenidos al podcast de hoy. Vamos a hablar sobre inteligencia artificial...',
        textWithTimestamps: '[0:00] Bienvenidos al podcast de hoy.\n[0:04] Vamos a hablar sobre inteligencia artificial.',
        duration: 3600,
        segmentCount: 3,
        wordCount: 18,
      },
    },
  },
  {
    id: 'hook-detection',
    name: 'Hook Detection',
    description: 'Detects high-retention viral hooks in the transcript BEFORE chapter generation. Uses low reasoning effort for fast extraction of controversy, revelations, bold claims, and emotional moments.',
    version: '2.0.0',
    module: 'episodes',
    model: 'gpt-4.1',
    provider: 'openai',
    status: 'active',
    tags: ['viral', 'hooks', 'retention', 'youtube'],
    author: 'vision-team',
    dependsOn: ['transcript-parsing'],
    feeds: ['gpt-analysis'],
    secrets: ['OPENAI_API_KEY'],
    guardrails: [
      { name: 'input-length-check', type: 'input' as const, description: 'Reject transcripts exceeding 100k characters', failAction: 'block' as const },
      { name: 'hook-score-range', type: 'output' as const, description: 'Ensure hook strength scores are 1-10', failAction: 'warn' as const },
    ],
    errors: [
      { code: 'RATE_LIMITED', description: 'OpenAI rate limit exceeded', recoverable: true, retryStrategy: 'exponential' as const },
      { code: 'EMPTY_TRANSCRIPT', description: 'Transcript has no content to analyze', recoverable: false },
    ],
    runtime: { timeout: 30000, concurrency: 3 },
    config: {
      reasoning: { effort: 'low' as const },
      maxTokens: 3000,
      temperature: 0.3,
      maxRetries: 3,
      retryBackoff: 'exponential' as const,
      caching: true,
      cacheTtl: 3600,
    },
    input: {
      description: 'Parsed transcript with timestamps',
      example: {
        textWithTimestamps: '[0:00] Bienvenidos al podcast...\n[2:30] Lo que nadie sabe es que...\n[5:15] Esto va a cambiar todo...',
        duration: 3600,
      },
    },
    output: {
      description: 'Array of detected hooks with viral scores and chapter suggestions',
      example: {
        hooks: [
          { timestamp: '2:30', quote: 'Lo que nadie sabe es que las grandes tech companies ya tienen AGI funcionando internamente.', hook_type: 'revelation', strength: 9, suggested_chapter_start: true },
          { timestamp: '5:15', quote: 'Esto va a cambiar completamente como entendemos la programación.', hook_type: 'bold_claim', strength: 7, suggested_chapter_start: false },
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
    stories: [
      {
        name: 'Happy path — Spanish podcast',
        description: 'Standard Spanish podcast transcript with clear hook moments. Expects non-empty hooks array.',
        input: {
          textWithTimestamps: '[0:00] Bienvenidos al podcast.\n[1:15] Hoy tenemos un tema increíble.\n[2:30] Lo que nadie sabe es que las grandes tech companies ya tienen AGI.\n[5:00] Esto cambia todo lo que conocemos.',
          duration: 600,
        },
        assertions: [
          { field: 'hooks.length', operator: 'gt' as const, value: 0 },
          { field: 'hooks[0].hook_type', operator: 'exists' as const, value: true },
          { field: 'hooks[0].strength', operator: 'gte' as const, value: 1 },
          { field: 'hooks[0].strength', operator: 'lte' as const, value: 10 },
        ],
        tags: ['happy-path'],
      },
      {
        name: 'Edge case — Empty transcript',
        description: 'Empty input should produce an empty hooks array without errors.',
        input: {
          textWithTimestamps: '',
          duration: 0,
        },
        expectedOutput: { hooks: [] },
        assertions: [
          { field: 'hooks.length', operator: 'equals' as const, value: 0 },
        ],
        tags: ['edge-case'],
      },
      {
        name: 'Stress — Very long episode',
        description: 'A 4-hour transcript with 50k+ characters. Tests rate limits, token limits, and timeout handling.',
        input: {
          textWithTimestamps: Array.from({ length: 200 }, (_, i) => `[${Math.floor(i * 72 / 60)}:${String(i * 72 % 60).padStart(2, '0')}] Segmento ${i + 1} del podcast con contenido extenso sobre tecnología e inteligencia artificial y sus implicaciones en la sociedad moderna.`).join('\n'),
          duration: 14400,
        },
        tags: ['stress'],
      },
    ],
    evaluations: [
      {
        dataset: 'hook-detection-v2-50-episodes',
        date: '2026-03-15',
        scores: { precision: 0.91, recall: 0.87, f1: 0.89, hookRelevance: 0.93 },
        notes: 'Tested against 50 manually-labeled Spanish podcast episodes. F1 improved 12% after prompt v2 rewrite.',
      },
    ],
    metrics: {
      avgTokensIn: 8000,
      avgTokensOut: 1200,
      avgLatencyMs: 3200,
      estimatedCostPer1k: 0.18,
      successRate: 0.98,
      totalRuns: 2340,
    },
  },
  {
    id: 'gpt-analysis',
    name: 'GPT Deep Analysis',
    description: '2-Call GPT pipeline with Chain of Thought. Call 1: deep analysis with medium reasoning. Call 2: formatting with no reasoning. Uses previous_response_id to preserve CoT context.',
    version: '3.0.0',
    module: 'episodes',
    model: 'gpt-4.1',
    provider: 'openai',
    status: 'active',
    tags: ['analysis', 'metadata', 'chapters', 'seo', 'youtube'],
    author: 'vision-team',
    dependsOn: ['transcript-parsing', 'hook-detection'],
    feeds: ['thumbnail-pipeline', 'trend-titles', 'viral-clips'],
    secrets: ['OPENAI_API_KEY'],
    guardrails: [
      { name: 'json-output-validator', type: 'output' as const, description: 'Ensure output is valid JSON with required fields', failAction: 'block' as const },
      { name: 'pii-filter', type: 'input' as const, description: 'Strip personally identifiable information before processing', failAction: 'warn' as const },
    ],
    handoffs: [
      { targetAgentId: 'claude-metadata', condition: 'OpenAI API unavailable for >5 minutes', transferData: true },
    ],
    errors: [
      { code: 'RATE_LIMITED', description: 'OpenAI rate limit exceeded', recoverable: true, retryStrategy: 'exponential' as const },
      { code: 'CONTEXT_TOO_LONG', description: 'Transcript exceeds model context window', recoverable: false },
      { code: 'INVALID_JSON', description: 'Model returned invalid JSON in response', recoverable: true, retryStrategy: 'immediate' as const },
    ],
    runtime: { timeout: 60000, concurrency: 2, memory: '512MB' },
    config: {
      reasoning: { effort: 'medium' as const },
      maxTokens: 8000,
      temperature: 0.4,
      maxRetries: 3,
      retryBackoff: 'exponential' as const,
      caching: true,
      rateLimit: 30,
    },
    input: {
      description: 'Parsed transcript + detected hooks for context-aware analysis',
      example: {
        fullText: 'Full podcast transcript text...',
        textWithTimestamps: '[0:00] Bienvenidos...',
        hooks: [{ timestamp: '2:30', quote: 'Lo que nadie sabe...', hook_type: 'revelation', strength: 9 }],
        duration: 3600,
      },
    },
    output: {
      description: 'Complete podcast metadata: guest info, chapters, titles, tags, descriptions',
      example: {
        guest: { name: 'Dr. Elena Torres', role: 'AI Research Lead at DeepMind' },
        topic: 'The hidden reality of AGI development in big tech',
        chapters: [
          { title: 'El estado real de la AGI', start: '0:00', summary: 'Introduction and context setting' },
          { title: 'Lo que las big tech no quieren que sepas', start: '2:30', summary: 'Revelation about internal AGI capabilities' },
        ],
        titles: ['Las Big Tech YA tienen AGI (y no lo saben)', 'La verdad sobre AGI que nadie se atreve a contar'],
        tags: ['agi', 'inteligencia-artificial', 'big-tech', 'deepmind'],
        description: 'En este episodio, la Dra. Elena Torres revela...',
      },
    },
    stories: [
      {
        name: 'Standard episode analysis',
        description: 'Full input with transcript and hooks. Expects chapters, titles, and structured metadata.',
        input: {
          fullText: 'Bienvenidos al podcast. Hoy hablamos con la Dra. Elena Torres sobre AGI. Lo que nadie sabe es que las grandes tech companies ya tienen AGI.',
          textWithTimestamps: '[0:00] Bienvenidos al podcast.\n[2:30] Lo que nadie sabe es que las grandes tech companies ya tienen AGI.',
          hooks: [
            { timestamp: '2:30', quote: 'Lo que nadie sabe es que las grandes tech companies ya tienen AGI.', hook_type: 'revelation', strength: 9 },
          ],
          duration: 3600,
        },
        assertions: [
          { field: 'chapters', operator: 'exists' as const, value: true },
          { field: 'chapters.length', operator: 'gt' as const, value: 0 },
          { field: 'titles', operator: 'exists' as const, value: true },
          { field: 'titles.length', operator: 'gte' as const, value: 1 },
          { field: 'tags', operator: 'type' as const, value: 'object' },
        ],
        tags: ['happy-path'],
      },
      {
        name: 'No hooks provided',
        description: 'Input without hooks array. The agent should still produce a valid analysis with chapters and titles.',
        input: {
          fullText: 'Bienvenidos al podcast de hoy. Vamos a hablar sobre machine learning y sus aplicaciones prácticas en la industria.',
          textWithTimestamps: '[0:00] Bienvenidos al podcast de hoy.\n[0:05] Vamos a hablar sobre machine learning.',
          duration: 1800,
        },
        assertions: [
          { field: 'chapters', operator: 'exists' as const, value: true },
          { field: 'titles', operator: 'exists' as const, value: true },
        ],
        tags: ['edge-case'],
      },
    ],
    prompt: `<role>
You are an EXPERT PODCAST ANALYST with deep knowledge of YouTube SEO, viral content, and audience retention.
You will analyze a podcast transcript in TWO phases:
Phase 1: Deep analysis with Chain of Thought reasoning
Phase 2: Structured formatting of the analysis results
</role>

<output_verbosity_spec>
ALWAYS return valid JSON. No markdown. No explanations outside the JSON structure.
</output_verbosity_spec>`,
    evaluations: [
      {
        dataset: 'gpt-analysis-v3-30-episodes',
        date: '2026-03-20',
        scores: { chapterAccuracy: 0.88, titleEngagement: 0.82, seoScore: 0.91, overallQuality: 0.87 },
        notes: 'V3 pipeline with CoT produces 15% better chapter boundaries vs v2. Title engagement measured via YouTube CTR proxy.',
      },
      {
        dataset: 'cross-language-10-episodes',
        date: '2026-02-28',
        scores: { chapterAccuracy: 0.79, titleEngagement: 0.75, overallQuality: 0.77 },
        notes: 'English language episodes. Lower scores expected — prompts optimized for Spanish.',
      },
    ],
    metrics: {
      avgTokensIn: 12000,
      avgTokensOut: 3500,
      avgLatencyMs: 8500,
      estimatedCostPer1k: 0.45,
      successRate: 0.97,
      totalRuns: 1870,
    },
  },
  {
    id: 'thumbnail-pipeline',
    name: 'Thumbnail Pipeline',
    description: 'Generates viral YouTube thumbnails using Gemini. Takes chapter context from GPT analysis and creates hook-driven thumbnails with face preservation, semantic inpainting, and brand-safe text overlays.',
    version: '1.5.0',
    module: 'episodes',
    model: 'gemini-2.5-flash',
    provider: 'google',
    status: 'active',
    tags: ['thumbnails', 'image-generation', 'gemini', 'visual'],
    author: 'vision-team',
    dependsOn: ['gpt-analysis'],
    feeds: ['thumbnail-variants'],
    tools: ['gemini-image-generation', 'background-removal'],
    secrets: ['GOOGLE_AI_API_KEY'],
    runtime: { timeout: 45000, gpu: true },
    config: { temperature: 0.8, maxTokens: 4096 },
    input: {
      description: 'Chapter context with visual cues from GPT analysis',
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
</structure>`,
    metrics: {
      avgTokensIn: 500,
      avgTokensOut: 2000,
      avgLatencyMs: 12000,
      estimatedCostPer1k: 0.12,
      successRate: 0.91,
    },
  },
  {
    id: 'thumbnail-variants',
    name: 'Thumbnail Variants',
    description: 'Generates 5 parallel thumbnail variants using different hook types: FOMO, SHOCK, CURIOSITY, AUTHORITY, CONTROVERSY. Same input, different visual treatments and text overlays.',
    version: '1.0.0',
    module: 'episodes',
    model: 'gemini-2.5-flash',
    provider: 'google',
    status: 'experimental',
    tags: ['thumbnails', 'variants', 'a-b-testing', 'parallel'],
    author: 'vision-team',
    dependsOn: ['thumbnail-pipeline'],
    config: { temperature: 0.9, maxTokens: 4096 },
    input: {
      description: 'Base thumbnail context + hook type for variant generation',
      example: {
        baseThumbnail: { imageUrl: 'https://...', hookQuote: 'YA TIENEN AGI' },
        hookType: 'FOMO',
      },
    },
    output: {
      description: '5 variant thumbnails with different visual treatments',
      example: {
        variants: [
          { hookType: 'FOMO', textOverlay: 'ANTES DE QUE SEA TARDE', imageUrl: 'https://...' },
          { hookType: 'SHOCK', textOverlay: 'NADIE ESPERABA ESTO', imageUrl: 'https://...' },
        ],
      },
    },
    metrics: {
      avgTokensIn: 600,
      avgTokensOut: 2500,
      avgLatencyMs: 15000,
      estimatedCostPer1k: 0.60,
      successRate: 0.85,
    },
  },
  {
    id: 'trend-titles',
    name: 'Trend Title Generator',
    description: 'Generates trend-connected YouTube titles using web search + GPT. Finds current trending topics related to the episode content and crafts titles that ride existing search momentum.',
    version: '1.2.0',
    module: 'episodes',
    model: 'gpt-4.1-mini',
    provider: 'openai',
    status: 'active',
    tags: ['titles', 'trends', 'seo', 'youtube'],
    author: 'vision-team',
    dependsOn: ['gpt-analysis'],
    tools: ['web-search', 'google-trends-api'],
    config: { temperature: 0.7, maxTokens: 2000 },
    input: {
      description: 'Episode topic + existing titles from GPT analysis',
      example: {
        topic: 'AGI development in big tech',
        existingTitles: ['Las Big Tech YA tienen AGI'],
        tags: ['agi', 'big-tech'],
      },
    },
    output: {
      description: 'Trend-optimized titles with search volume data',
      example: {
        titles: [
          { text: 'AGI en 2026: Lo que Google no quiere que sepas', trendScore: 85, searchVolume: 'high' },
          { text: 'OpenAI vs Google: La carrera secreta por AGI', trendScore: 72, searchVolume: 'medium' },
        ],
      },
    },
    metrics: {
      avgTokensIn: 1500,
      avgTokensOut: 800,
      avgLatencyMs: 5000,
      estimatedCostPer1k: 0.22,
      successRate: 0.94,
    },
  },
  {
    id: 'viral-clips',
    name: 'Viral Clip Extractor',
    description: 'Detects and exports viral-worthy short clips from detected hooks. Uses FFmpeg for precise cutting with fade-in/out, subtitles, and format optimization for YouTube Shorts, TikTok, and Instagram Reels.',
    version: '1.0.0',
    module: 'episodes',
    status: 'active',
    tags: ['clips', 'shorts', 'tiktok', 'reels', 'ffmpeg'],
    author: 'vision-team',
    dependsOn: ['gpt-analysis'],
    tools: ['ffmpeg-wasm'],
    config: { maxTokens: 0 },
    input: {
      description: 'Hook data + video source for clip extraction',
      example: {
        hooks: [{ timestamp: '2:30', clipStart: 140, clipEnd: 185, quote: 'Lo que nadie sabe...', viralScore: 9 }],
        videoPath: '/uploads/episode-042.mp4',
      },
    },
    output: {
      description: 'Exported clip files with metadata',
      example: {
        clips: [
          { path: '/clips/ep042-hook1.mp4', duration: 45, format: '9:16', subtitles: true, hookType: 'revelation' },
        ],
      },
    },
  },
  {
    id: 'claude-metadata',
    name: 'Claude Metadata Enhancer',
    description: 'Uses Claude Sonnet for high-quality metadata refinement. Takes GPT analysis output and enhances descriptions, SEO tags, and social media copy with more nuanced language understanding.',
    version: '1.0.0',
    module: 'episodes',
    model: 'claude-sonnet-4-6',
    provider: 'anthropic',
    status: 'experimental',
    tags: ['metadata', 'claude', 'seo', 'descriptions'],
    author: 'vision-team',
    dependsOn: ['gpt-analysis'],
    config: { temperature: 0.5, maxTokens: 4000 },
    input: {
      description: 'GPT analysis output for refinement',
      example: {
        topic: 'AGI development in big tech',
        description: 'En este episodio...',
        tags: ['agi', 'big-tech'],
      },
    },
    output: {
      description: 'Enhanced metadata with improved descriptions and tags',
      example: {
        description: 'Refined, SEO-optimized description...',
        socialCopy: { twitter: '...', instagram: '...', linkedin: '...' },
        enhancedTags: ['agi-2026', 'artificial-general-intelligence', 'big-tech-secrets'],
      },
    },
    prompt: `You are an expert content strategist. Refine the provided metadata for maximum engagement across platforms.`,
    metrics: {
      avgTokensIn: 2000,
      avgTokensOut: 1500,
      avgLatencyMs: 4200,
      estimatedCostPer1k: 0.30,
      successRate: 0.99,
    },
  },
  {
    id: 'whisper-transcription',
    name: 'Whisper Transcription',
    description: 'Transcribes audio using OpenAI Whisper API with fallback to local Whisper. Supports Spanish, English, and auto-detection. Handles long-form podcast audio up to 4 hours.',
    version: '2.1.0',
    module: 'services',
    model: 'whisper-large-v3',
    provider: 'openai',
    status: 'active',
    tags: ['transcription', 'whisper', 'audio', 'speech-to-text'],
    author: 'vision-team',
    feeds: ['transcript-parsing'],
    config: { temperature: 0 },
    input: {
      description: 'Audio file path or URL',
      example: { audioPath: '/uploads/episode-042.mp3', language: 'es' },
    },
    output: {
      description: 'Raw Whisper segments with timestamps',
      example: {
        segments: [{ start: 0, end: 4.5, text: 'Bienvenidos al podcast de hoy.' }],
        duration: 3600,
        language: 'es',
      },
    },
    metrics: {
      avgLatencyMs: 45000,
      estimatedCostPer1k: 0.36,
      successRate: 0.96,
    },
  },
  {
    id: 'youtube-seo-optimizer',
    name: 'YouTube SEO Optimizer',
    description: 'Final-pass SEO optimization for YouTube uploads. Validates title length, description structure, tag density, and hashtag placement against 2026 YouTube algorithm best practices.',
    version: '1.0.0',
    module: 'services',
    status: 'deprecated',
    tags: ['seo', 'youtube', 'optimization', 'validation'],
    author: 'vision-team',
    dependsOn: ['gpt-analysis', 'trend-titles'],
    input: {
      description: 'Complete metadata package for YouTube upload',
      example: {
        title: 'Las Big Tech YA tienen AGI',
        description: '...',
        tags: ['agi', 'big-tech'],
        hashtags: ['#AGI', '#IA'],
      },
    },
    output: {
      description: 'Validated and optimized metadata with warnings',
      example: {
        optimized: { title: 'Las Big Tech YA tienen AGI (y no lo saben)', titleLength: 48 },
        warnings: ['Description should be at least 200 words for SEO'],
        score: 87,
      },
    },
  },

  // ── Intentionally low-quality agents (demonstrate analyzer) ──────────────

  {
    id: 'quick-summarizer',
    name: 'Quick Summarizer',
    description: 'Summarizes text.',
    model: 'gpt-4.1-nano',
    provider: 'openai',
    status: 'experimental',
    config: { temperature: 1.5, maxTokens: 20000 },
    input: {
      description: 'Text to summarize',
    },
    output: {
      description: 'Summary',
    },
  },

  {
    id: 'test-agent',
    name: 'Test Agent',
    model: 'claude-sonnet-4-6',
    provider: 'anthropic',
    status: 'experimental',
  },

  // ── Legacy agents (from markdown scanner) ──────────────────────────────────

  {
    id: 'md-transcription',
    name: 'Transcription Service',
    description: 'Audio-to-text transcription with automatic backend selection. Supports local MLX Whisper and OpenAI Whisper API with chunking for long-form audio.',
    version: '1.0.0',
    module: 'services',
    model: 'whisper-large-v3',
    provider: 'openai',
    status: 'legacy',
    tags: ['transcription', 'services'],
    author: 'vision-team',
    feeds: ['transcript-parsing'],
    input: {
      description: 'TranscriptionOptions',
      example: { audioPath: '/uploads/episode-042.mp3', language: 'es' },
    },
    output: {
      description: 'TranscriptResult',
      example: {
        text: 'Bienvenidos al podcast...',
        language: 'es',
        duration: 3600,
        segments: [{ id: 0, start: 0, end: 4.5, text: 'Bienvenidos al podcast de hoy.' }],
      },
    },
    documentationFile: '.agents/services/TRANSCRIPTION.md',
  },
];

export const MOCK_PIPELINES = [
  {
    id: 'episode-processing',
    name: 'Episode Processing Pipeline',
    description: 'Complete pipeline from raw audio to published YouTube content with AI-generated metadata, thumbnails, and viral clips.',
    stages: [
      'whisper-transcription',
      'transcript-parsing',
      'hook-detection',
      'gpt-analysis',
      'thumbnail-pipeline',
      'thumbnail-variants',
      'trend-titles',
      'viral-clips',
    ],
  },
  {
    id: 'metadata-enhancement',
    name: 'Metadata Enhancement Pipeline',
    description: 'Secondary pipeline for refining and optimizing content metadata across platforms.',
    stages: [
      'gpt-analysis',
      'claude-metadata',
      'trend-titles',
      'youtube-seo-optimizer',
    ],
  },
];
