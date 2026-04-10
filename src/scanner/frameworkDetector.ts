import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// Types
// ============================================================================

type Framework =
  | 'openai-sdk'
  | 'anthropic-sdk'
  | 'vercel-ai'
  | 'langchain'
  | 'generic';

type Provider = 'openai' | 'anthropic' | 'google' | 'custom';

interface DetectedAgent {
  id: string;
  name: string;
  description: string;
  version: string;
  model?: string;
  provider?: Provider;
  prompt?: string;
  sourceFile: string;
  framework: Framework;
  status: 'active';
  tags: string[];
  module?: string;
}

// ============================================================================
// Summary — grouped counts by framework per directory
// ============================================================================

interface DetectionSummary {
  /** e.g. { 'openai-sdk': 3, 'vercel-ai': 1 } */
  byFramework: Record<string, number>;
  /** e.g. { 'src/': { 'openai-sdk': 3 }, 'lib/': { 'vercel-ai': 1 } } */
  byDirectory: Record<string, Record<string, number>>;
  total: number;
}

export function summarizeDetections(
  agents: DetectedAgent[],
  rootDir: string,
): DetectionSummary {
  const byFramework: Record<string, number> = {};
  const byDirectory: Record<string, Record<string, number>> = {};

  for (const agent of agents) {
    byFramework[agent.framework] = (byFramework[agent.framework] ?? 0) + 1;

    const rel = path.relative(rootDir, agent.sourceFile);
    const topDir = rel.split(path.sep)[0] + '/';
    if (!byDirectory[topDir]) byDirectory[topDir] = {};
    byDirectory[topDir][agent.framework] =
      (byDirectory[topDir][agent.framework] ?? 0) + 1;
  }

  return { byFramework, byDirectory, total: agents.length };
}

// ============================================================================
// Framework-friendly label
// ============================================================================

const FRAMEWORK_LABELS: Record<Framework, string> = {
  'openai-sdk': 'OpenAI SDK',
  'anthropic-sdk': 'Anthropic SDK',
  'vercel-ai': 'Vercel AI',
  'langchain': 'LangChain',
  'generic': 'Generic AI',
};

export function frameworkLabel(fw: Framework): string {
  return FRAMEWORK_LABELS[fw] ?? fw;
}

// ============================================================================
// Public API
// ============================================================================

export async function detectFrameworkAgents(
  rootDir: string,
): Promise<DetectedAgent[]> {
  const files = await fg(
    [
      'src/**/*.{ts,tsx,js,jsx}',
      'app/**/*.{ts,tsx,js,jsx}',
      'lib/**/*.{ts,tsx,js,jsx}',
      'agents/**/*.{ts,tsx,js,jsx}',
      'api/**/*.{ts,tsx,js,jsx}',
    ],
    {
      cwd: rootDir,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts',
        // Skip archon's own files — don't detect ourselves
        '**/*.agent.ts',
        '**/*.agent.js',
      ],
    },
  );

  const agents: DetectedAgent[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');

      agents.push(...detectOpenAIAgents(content, file, rootDir));
      agents.push(...detectAnthropicAgents(content, file, rootDir));
      agents.push(...detectVercelAI(content, file, rootDir));
      agents.push(...detectLangChain(content, file, rootDir));
      agents.push(...detectGeneric(content, file, rootDir));
    } catch {
      // Resilient — skip files that fail to read/parse
    }
  }

  // Deduplicate by id (first occurrence wins)
  const seen = new Set<string>();
  return agents.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

// ============================================================================
// Helpers
// ============================================================================

function makeId(framework: string, filePath: string, index: number): string {
  const base = path
    .basename(filePath)
    .replace(/\.(ts|tsx|js|jsx)$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase();
  return `${framework}-${base}-${index}`;
}

function humanName(filePath: string, index: number, framework: string): string {
  const base = path
    .basename(filePath)
    .replace(/\.(ts|tsx|js|jsx)$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const suffix = index > 0 ? ` (${index + 1})` : '';
  return `${base}${suffix}`;
}

function deriveModule(filePath: string, rootDir: string): string | undefined {
  const rel = path.relative(rootDir, filePath);
  const parts = rel.split(path.sep);
  return parts.length >= 2 ? parts[parts.length - 2] : undefined;
}

function inferProvider(model: string): Provider {
  const lower = model.toLowerCase();
  if (
    lower.startsWith('gpt') ||
    lower.startsWith('o1') ||
    lower.startsWith('o3') ||
    lower.startsWith('o4') ||
    lower.includes('davinci') ||
    lower.includes('turbo')
  ) {
    return 'openai';
  }
  if (lower.startsWith('claude') || lower.includes('anthropic')) {
    return 'anthropic';
  }
  if (lower.startsWith('gemini') || lower.includes('palm')) {
    return 'google';
  }
  return 'custom';
}

/** Extract a string literal value from a match like `name: "foo"` or `name: 'foo'` */
function extractStringLiteral(text: string): string | undefined {
  const match = text.match(/['"`]([^'"`]+)['"`]/);
  return match?.[1];
}

/** Extract a multi-line template literal or string value */
function extractStringOrTemplateLiteral(
  content: string,
  key: string,
  startFrom: number,
): string | undefined {
  // Search within a reasonable window from the start position
  const window = content.slice(startFrom, startFrom + 5000);

  // Try template literal: key: `...`
  const templateRe = new RegExp(`${key}\\s*:\\s*\`([\\s\\S]*?)\``);
  const tmatch = window.match(templateRe);
  if (tmatch) return tmatch[1].trim();

  // Try string literal: key: "..." or key: '...'
  const stringRe = new RegExp(`${key}\\s*:\\s*['"]([^'"]*?)['"]`);
  const smatch = window.match(stringRe);
  if (smatch) return smatch[1].trim();

  return undefined;
}

// ============================================================================
// 1. OpenAI Agents SDK — `new Agent({...})` from `@openai/agents`
// ============================================================================

function detectOpenAIAgents(
  content: string,
  filePath: string,
  rootDir: string,
): DetectedAgent[] {
  // Must import from @openai/agents
  if (!/@openai\/agents/.test(content)) return [];

  const agents: DetectedAgent[] = [];
  // Match `new Agent({` or `Agent({`
  const agentRe = /(?:new\s+)?Agent\s*\(\s*\{/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = agentRe.exec(content)) !== null) {
    const start = match.index;
    const name =
      extractStringOrTemplateLiteral(content, 'name', start) ??
      humanName(filePath, index, 'openai');
    const instructions = extractStringOrTemplateLiteral(
      content,
      'instructions',
      start,
    );
    const model = extractStringOrTemplateLiteral(content, 'model', start);

    agents.push({
      id: makeId('openai', filePath, index),
      name,
      description: instructions
        ? instructions.slice(0, 200) + (instructions.length > 200 ? '...' : '')
        : `OpenAI agent defined in ${path.basename(filePath)}`,
      version: '1.0.0',
      model,
      provider: model ? inferProvider(model) : 'openai',
      prompt: instructions,
      sourceFile: filePath,
      framework: 'openai-sdk',
      status: 'active',
      tags: ['openai', 'auto-detected'],
      module: deriveModule(filePath, rootDir),
    });

    index++;
  }

  return agents;
}

// ============================================================================
// 2. Anthropic SDK — `Anthropic()` + `messages.create`
// ============================================================================

function detectAnthropicAgents(
  content: string,
  filePath: string,
  rootDir: string,
): DetectedAgent[] {
  // Must import from @anthropic-ai/sdk
  if (!/@anthropic-ai\/sdk/.test(content)) return [];

  const agents: DetectedAgent[] = [];
  // Match messages.create({ ... })
  const createRe = /messages\.create\s*\(\s*\{/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = createRe.exec(content)) !== null) {
    const start = match.index;
    const model = extractStringOrTemplateLiteral(content, 'model', start);
    const system = extractStringOrTemplateLiteral(content, 'system', start);

    agents.push({
      id: makeId('anthropic', filePath, index),
      name: humanName(filePath, index, 'anthropic'),
      description: system
        ? system.slice(0, 200) + (system.length > 200 ? '...' : '')
        : `Anthropic agent defined in ${path.basename(filePath)}`,
      version: '1.0.0',
      model,
      provider: 'anthropic',
      prompt: system,
      sourceFile: filePath,
      framework: 'anthropic-sdk',
      status: 'active',
      tags: ['anthropic', 'claude', 'auto-detected'],
      module: deriveModule(filePath, rootDir),
    });

    index++;
  }

  // If no messages.create found but the import exists, create one generic agent
  if (agents.length === 0) {
    agents.push({
      id: makeId('anthropic', filePath, 0),
      name: humanName(filePath, 0, 'anthropic'),
      description: `Anthropic SDK usage in ${path.basename(filePath)}`,
      version: '1.0.0',
      provider: 'anthropic',
      sourceFile: filePath,
      framework: 'anthropic-sdk',
      status: 'active',
      tags: ['anthropic', 'auto-detected'],
      module: deriveModule(filePath, rootDir),
    });
  }

  return agents;
}

// ============================================================================
// 3. Vercel AI SDK — generateText / streamText / generateObject from 'ai'
// ============================================================================

function detectVercelAI(
  content: string,
  filePath: string,
  rootDir: string,
): DetectedAgent[] {
  // Must import from 'ai' package (Vercel AI SDK)
  const aiImport = /from\s+['"]ai['"]/.test(content);
  const aiCoreImport = /from\s+['"]ai\/[\w-]+['"]/.test(content);
  if (!aiImport && !aiCoreImport) return [];

  const agents: DetectedAgent[] = [];
  // Match generateText({ ... }), streamText({ ... }), generateObject({ ... })
  const fnRe = /(generateText|streamText|generateObject)\s*\(\s*\{/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = fnRe.exec(content)) !== null) {
    const fnName = match[1];
    const start = match.index;

    const system = extractStringOrTemplateLiteral(content, 'system', start);
    const prompt = extractStringOrTemplateLiteral(content, 'prompt', start);

    // Model in Vercel AI is usually like `openai('gpt-4o')` or `anthropic('claude-sonnet-4-20250514')`
    const modelWindow = content.slice(start, start + 500);
    const modelCallMatch = modelWindow.match(
      /model\s*:\s*(?:(\w+)\s*\(\s*['"]([^'"]+)['"]\s*\)|['"]([^'"]+)['"])/,
    );
    const modelProvider = modelCallMatch?.[1]; // e.g. 'openai', 'anthropic'
    const model = modelCallMatch?.[2] ?? modelCallMatch?.[3];

    const effectivePrompt = system ?? prompt;

    agents.push({
      id: makeId('vercel-ai', filePath, index),
      name: humanName(filePath, index, 'vercel-ai'),
      description: effectivePrompt
        ? effectivePrompt.slice(0, 200) +
          (effectivePrompt.length > 200 ? '...' : '')
        : `Vercel AI ${fnName}() in ${path.basename(filePath)}`,
      version: '1.0.0',
      model,
      provider: model
        ? inferProvider(model)
        : modelProvider
          ? (inferProvider(modelProvider) as Provider)
          : undefined,
      prompt: effectivePrompt,
      sourceFile: filePath,
      framework: 'vercel-ai',
      status: 'active',
      tags: ['vercel-ai', fnName, 'auto-detected'],
      module: deriveModule(filePath, rootDir),
    });

    index++;
  }

  return agents;
}

// ============================================================================
// 4. LangChain (JS) — ChatOpenAI, ChatAnthropic, ChatPromptTemplate, etc.
// ============================================================================

function detectLangChain(
  content: string,
  filePath: string,
  rootDir: string,
): DetectedAgent[] {
  // Must import from @langchain/*
  if (!/@langchain\//.test(content) && !/from\s+['"]langchain/.test(content)) {
    return [];
  }

  const agents: DetectedAgent[] = [];

  // Detect model instantiations
  const modelRe =
    /new\s+(ChatOpenAI|ChatAnthropic|ChatGoogleGenerativeAI)\s*\(\s*\{/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = modelRe.exec(content)) !== null) {
    const className = match[1];
    const start = match.index;
    const modelName = extractStringOrTemplateLiteral(
      content,
      'modelName',
      start,
    ) ?? extractStringOrTemplateLiteral(content, 'model', start);

    let provider: Provider = 'custom';
    if (className === 'ChatOpenAI') provider = 'openai';
    else if (className === 'ChatAnthropic') provider = 'anthropic';
    else if (className === 'ChatGoogleGenerativeAI') provider = 'google';

    agents.push({
      id: makeId('langchain', filePath, index),
      name: humanName(filePath, index, 'langchain'),
      description: `LangChain ${className} agent in ${path.basename(filePath)}`,
      version: '1.0.0',
      model: modelName,
      provider,
      sourceFile: filePath,
      framework: 'langchain',
      status: 'active',
      tags: ['langchain', className.toLowerCase(), 'auto-detected'],
      module: deriveModule(filePath, rootDir),
    });

    index++;
  }

  // Detect ChatPromptTemplate usage (even without explicit model instantiation)
  if (
    agents.length === 0 &&
    /ChatPromptTemplate\.from(Messages|Template)\s*\(/.test(content)
  ) {
    agents.push({
      id: makeId('langchain', filePath, 0),
      name: humanName(filePath, 0, 'langchain'),
      description: `LangChain prompt chain in ${path.basename(filePath)}`,
      version: '1.0.0',
      sourceFile: filePath,
      framework: 'langchain',
      status: 'active',
      tags: ['langchain', 'prompt-template', 'auto-detected'],
      module: deriveModule(filePath, rootDir),
    });
  }

  // Detect RunnableSequence / AgentExecutor
  if (
    agents.length === 0 &&
    /(RunnableSequence|AgentExecutor|createReactAgent|createOpenAIFunctionsAgent)/.test(
      content,
    )
  ) {
    agents.push({
      id: makeId('langchain', filePath, 0),
      name: humanName(filePath, 0, 'langchain'),
      description: `LangChain agent chain in ${path.basename(filePath)}`,
      version: '1.0.0',
      sourceFile: filePath,
      framework: 'langchain',
      status: 'active',
      tags: ['langchain', 'agent-chain', 'auto-detected'],
      module: deriveModule(filePath, rootDir),
    });
  }

  return agents;
}

// ============================================================================
// 5. Generic — files importing AI provider packages without matching above
// ============================================================================

function detectGeneric(
  content: string,
  filePath: string,
  rootDir: string,
): DetectedAgent[] {
  // Skip if already detected by a specific framework detector.
  // We check the same import patterns that the specific detectors use.
  if (/@openai\/agents/.test(content)) return [];
  if (/@anthropic-ai\/sdk/.test(content)) return [];
  if (/from\s+['"]ai['"]/.test(content) || /from\s+['"]ai\/[\w-]+['"]/.test(content)) return [];
  if (/@langchain\//.test(content) || /from\s+['"]langchain/.test(content)) return [];

  // Check for generic AI SDK imports
  const genericImports: Array<{ pattern: RegExp; provider: Provider; tag: string }> = [
    { pattern: /from\s+['"]openai['"]/, provider: 'openai', tag: 'openai' },
    { pattern: /from\s+['"]@google\/generative-ai['"]/, provider: 'google', tag: 'google-ai' },
    { pattern: /from\s+['"]@google-ai\/generativelanguage['"]/, provider: 'google', tag: 'google-ai' },
    { pattern: /from\s+['"]@mistralai\/[\w-]+['"]/, provider: 'custom', tag: 'mistral' },
    { pattern: /from\s+['"]cohere-ai['"]/, provider: 'custom', tag: 'cohere' },
    { pattern: /from\s+['"]groq-sdk['"]/, provider: 'custom', tag: 'groq' },
  ];

  const agents: DetectedAgent[] = [];

  for (const { pattern, provider, tag } of genericImports) {
    if (pattern.test(content)) {
      // Try to find a model string
      const modelMatch = content.match(
        /model\s*[:=]\s*['"]([^'"]+)['"]/,
      );
      const model = modelMatch?.[1];

      agents.push({
        id: makeId('generic', filePath, agents.length),
        name: humanName(filePath, agents.length, 'generic'),
        description: `AI agent using ${tag} SDK in ${path.basename(filePath)}`,
        version: '1.0.0',
        model,
        provider: model ? inferProvider(model) : provider,
        sourceFile: filePath,
        framework: 'generic',
        status: 'active',
        tags: [tag, 'auto-detected'],
        module: deriveModule(filePath, rootDir),
      });

      break; // One agent per file for generic detection
    }
  }

  return agents;
}
