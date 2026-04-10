import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarkdownAgentIO {
  description?: string;
  example?: unknown;
}

interface MarkdownAgent {
  id: string;
  name: string;
  description: string;
  version: string;
  module?: string;
  model?: string;
  provider?: 'openai' | 'anthropic' | 'google' | 'custom';
  config?: Record<string, unknown>;
  input?: MarkdownAgentIO;
  output?: MarkdownAgentIO;
  prompt?: string;
  dependsOn?: string[];
  feeds?: string[];
  tools?: string[];
  tags?: string[];
  author?: string;
  status: 'legacy';
  documentationFile: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function scanMarkdownFiles(
  rootDir: string,
  patterns: string[],
): Promise<MarkdownAgent[]> {
  const files = await fg(patterns, {
    cwd: rootDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**'],
  });

  const agents: MarkdownAgent[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const agent = parseMarkdownAgent(content, file, rootDir);
      if (agent) {
        agents.push(agent);
      }
    } catch {
      // Resilient — skip files that fail to parse
    }
  }

  return agents;
}

// ---------------------------------------------------------------------------
// Core Parser
// ---------------------------------------------------------------------------

function parseMarkdownAgent(
  content: string,
  filePath: string,
  rootDir: string,
): MarkdownAgent | null {
  // Extract H1 — required
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (!h1Match) return null;

  const rawName = h1Match[1].trim();
  const name = stripEmoji(rawName);
  if (!name) return null;

  const id = deriveId(filePath);
  const module = deriveModule(filePath, rootDir);
  const description = extractDescription(content, h1Match.index ?? 0);
  const prompt = extractXmlPrompt(content);
  const model = extractModel(content);
  const provider = model ? inferProvider(model) : undefined;
  const { input, output } = extractIO(content);
  const { dependsOn, feeds } = extractRelations(content);
  const tags = extractTags(content, filePath);

  return {
    id,
    name,
    description: description || name,
    version: '1.0.0',
    module: module || undefined,
    model: model || undefined,
    provider,
    input: input || undefined,
    output: output || undefined,
    prompt: prompt || undefined,
    dependsOn: dependsOn.length > 0 ? dependsOn : undefined,
    feeds: feeds.length > 0 ? feeds : undefined,
    tags: tags.length > 0 ? tags : undefined,
    author: 'vision-team',
    status: 'legacy',
    documentationFile: filePath,
  };
}

// ---------------------------------------------------------------------------
// ID derivation
// ---------------------------------------------------------------------------

function deriveId(filePath: string): string {
  const base = path.basename(filePath, '.md');
  // Strip leading numbers + underscore: "02_HOOK_DETECTION" -> "hook-detection"
  const stripped = base
    .replace(/^\d+_/, '')
    .replace(/^REF_/, 'ref-')
    .toLowerCase()
    .replace(/_/g, '-');
  return `md-${stripped}`;
}

// ---------------------------------------------------------------------------
// Module derivation
// ---------------------------------------------------------------------------

function deriveModule(filePath: string, rootDir: string): string | null {
  const relative = path.relative(rootDir, filePath);
  const parts = relative.split(path.sep);
  // The folder immediately containing the file
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Emoji stripping
// ---------------------------------------------------------------------------

function stripEmoji(text: string): string {
  // Remove leading emoji (Unicode emoji + variation selectors + ZWJ sequences)
  // Also handles common patterns like "Module 02:"
  return text
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{FE0F}\u{200D}]+\s*/gu, '')
    .replace(/^Module\s+\d+:\s*/i, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Description extraction
// ---------------------------------------------------------------------------

function extractDescription(content: string, h1End: number): string {
  // Find the text after H1 up to the next heading or ---
  const afterH1 = content.slice(h1End);
  const lines = afterH1.split('\n');

  // Skip the H1 line itself
  let started = false;
  const paragraphLines: string[] = [];

  for (const line of lines) {
    if (!started) {
      if (line.match(/^#\s+/)) { started = true; continue; }
      continue;
    }

    const trimmed = line.trim();

    // Stop at next heading, horizontal rule, or code block
    if (trimmed.startsWith('#') || trimmed === '---' || trimmed.startsWith('```')) break;

    if (trimmed === '') {
      if (paragraphLines.length > 0) break; // End of first paragraph
      continue;
    }

    paragraphLines.push(trimmed);
  }

  return paragraphLines.join(' ');
}

// ---------------------------------------------------------------------------
// XML prompt extraction
// ---------------------------------------------------------------------------

function extractXmlPrompt(content: string): string | null {
  const xmlTags = ['role', 'task', 'output_verbosity_spec', 'hook_type_definitions',
    'extraction_spec', 'quality_criteria', 'long_context_handling', 'hook_context',
    'face_preservation_rules', 'structure', 'system', 'instructions'];

  const fragments: string[] = [];

  for (const tag of xmlTags) {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      fragments.push(`<${tag}>\n${match[1].trim()}\n</${tag}>`);
    }
  }

  return fragments.length > 0 ? fragments.join('\n\n') : null;
}

// ---------------------------------------------------------------------------
// Model extraction
// ---------------------------------------------------------------------------

function extractModel(content: string): string | null {
  // Look for model names in code blocks, tables, or plain text
  const modelPatterns = [
    /\bmodel:\s*['"]([^'"]+)['"]/i,
    /\b(gpt-[\w.-]+)\b/i,
    /\b(claude-[\w.-]+)\b/i,
    /\b(gemini-[\w.-]+)\b/i,
    /\b(whisper-[\w.-]+)\b/i,
    /\b(o[1-4](?:-[\w]+)?)\b/i,
  ];

  for (const pattern of modelPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Provider inference
// ---------------------------------------------------------------------------

function inferProvider(model: string): 'openai' | 'anthropic' | 'google' | 'custom' {
  const lower = model.toLowerCase();
  if (lower.startsWith('gpt') || lower.startsWith('o1') || lower.startsWith('o3') || lower.startsWith('o4') || lower.includes('whisper')) {
    return 'openai';
  }
  if (lower.startsWith('claude') || lower.includes('anthropic')) {
    return 'anthropic';
  }
  if (lower.startsWith('gemini') || lower.includes('nano')) {
    return 'google';
  }
  return 'custom';
}

// ---------------------------------------------------------------------------
// I/O extraction
// ---------------------------------------------------------------------------

function extractIO(content: string): { input: MarkdownAgentIO | null; output: MarkdownAgentIO | null } {
  return {
    input: extractIOSection(content, 'input'),
    output: extractIOSection(content, 'output'),
  };
}

function extractIOSection(content: string, type: 'input' | 'output'): MarkdownAgentIO | null {
  // Look for sections like "## Input", "## Input Types", "## Input (from Whisper)"
  // or "## Output", "## Output Types"
  const headingPattern = new RegExp(
    `^##\\s+${type}[^\\n]*$`,
    'im',
  );
  const headingMatch = content.match(headingPattern);
  if (!headingMatch || headingMatch.index === undefined) return null;

  // Grab content from this heading to the next ## heading
  const sectionStart = headingMatch.index + headingMatch[0].length;
  const nextHeading = content.slice(sectionStart).search(/^##\s+/m);
  const section = nextHeading >= 0
    ? content.slice(sectionStart, sectionStart + nextHeading)
    : content.slice(sectionStart);

  // Extract interface name as description
  const interfaceMatch = section.match(/interface\s+(\w+)/);
  const description = interfaceMatch ? interfaceMatch[1] : undefined;

  // Extract JSON examples
  const example = extractJsonExample(section);

  if (!description && !example) return null;

  return { description, example };
}

function extractJsonExample(section: string): unknown | undefined {
  // Look for JSON or TS object literals in code blocks
  const codeBlocks = [...section.matchAll(/```(?:json|typescript|ts)?\s*\n([\s\S]*?)```/g)];

  for (const block of codeBlocks) {
    const code = block[1].trim();
    // Try to parse as JSON directly
    try {
      return JSON.parse(code);
    } catch {
      // Not valid JSON — try to extract a const assignment
      const constMatch = code.match(/(?:const|let|var)\s+\w+\s*=\s*({[\s\S]*});?\s*$/);
      if (constMatch) {
        try {
          // Attempt to eval the object literal safely via JSON-like parsing
          // Replace single quotes with double quotes and strip trailing commas
          const cleaned = constMatch[1]
            .replace(/'/g, '"')
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/(\w+):/g, '"$1":')
            // Handle already-quoted keys
            .replace(/""/g, '"');
          return JSON.parse(cleaned);
        } catch {
          // Skip malformed examples
        }
      }
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Relations extraction (dependsOn, feeds)
// ---------------------------------------------------------------------------

function extractRelations(content: string): { dependsOn: string[]; feeds: string[] } {
  const dependsOn: string[] = [];
  const feeds: string[] = [];

  // Look for "Next Step" links → feeds
  const nextStepMatches = [...content.matchAll(/Next\s+Step[\s\S]*?\[.*?(\d+)[\s_]([A-Z_]+)/gi)];
  for (const m of nextStepMatches) {
    const name = m[2].toLowerCase().replace(/_/g, '-');
    feeds.push(name);
  }

  // Look for "Related Files", "Data Flow", and cross-references to other modules
  const moduleRefs = [...content.matchAll(/Module\s+(\d+)[:\s]+(\w[\w\s]*?)(?:[,|\]\n)])/gi)];
  for (const m of moduleRefs) {
    const moduleNum = parseInt(m[1]);
    const moduleName = m[2].trim().toLowerCase().replace(/\s+/g, '-');
    // Lower module numbers are dependencies, higher are feeds
    const currentNum = extractModuleNumber(content);
    if (currentNum !== null) {
      if (moduleNum < currentNum) {
        dependsOn.push(moduleName);
      } else if (moduleNum > currentNum) {
        feeds.push(moduleName);
      }
    }
  }

  // Look for markdown links to other numbered modules as dependencies
  const linkMatches = [...content.matchAll(/\[.*?Module\s+(\d+).*?\]\(\.\/(\d+)_([A-Z_]+)\.md\)/gi)];
  for (const m of linkMatches) {
    const linkedNum = parseInt(m[1]);
    const name = m[3].toLowerCase().replace(/_/g, '-');
    const currentNum = extractModuleNumber(content);
    if (currentNum !== null) {
      if (linkedNum < currentNum) {
        if (!dependsOn.includes(name)) dependsOn.push(name);
      } else if (linkedNum > currentNum) {
        if (!feeds.includes(name)) feeds.push(name);
      }
    }
  }

  return {
    dependsOn: [...new Set(dependsOn)],
    feeds: [...new Set(feeds)],
  };
}

function extractModuleNumber(content: string): number | null {
  const match = content.match(/Module\s+(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

// ---------------------------------------------------------------------------
// Tag extraction
// ---------------------------------------------------------------------------

function extractTags(content: string, filePath: string): string[] {
  const tags: string[] = [];

  // Look for a "Tags" section
  const tagsSection = content.match(/^##\s+Tags?\s*\n([\s\S]*?)(?=^##|\z)/im);
  if (tagsSection) {
    const tagMatches = [...tagsSection[1].matchAll(/`([^`]+)`/g)];
    for (const m of tagMatches) {
      tags.push(m[1].toLowerCase());
    }
  }

  // Infer from filename
  const base = path.basename(filePath, '.md');
  const parts = base.replace(/^\d+_/, '').replace(/^REF_/, '').toLowerCase().split('_');
  for (const part of parts) {
    if (part.length > 2 && !tags.includes(part)) {
      tags.push(part);
    }
  }

  // Infer from parent folder
  const folder = path.basename(path.dirname(filePath));
  if (folder && !tags.includes(folder)) {
    tags.push(folder);
  }

  return [...new Set(tags)];
}
