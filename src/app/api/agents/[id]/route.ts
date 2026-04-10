import { NextResponse } from 'next/server';
import { getRegistry, invalidateRegistry } from '@/lib/registry';
import fs from 'node:fs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const registry = await getRegistry();
  const agent = registry.getSerializable(id);

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  return NextResponse.json(agent);
}

/* ------------------------------------------------------------------ */
/*  PATCH — Update agent source file (dev mode only)                   */
/* ------------------------------------------------------------------ */

interface AgentUpdates {
  prompt?: string;
  description?: string;
  status?: string;
  tags?: string[];
  config?: {
    temperature?: number;
    maxTokens?: number;
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Editing is only available in development mode' },
      { status: 403 },
    );
  }

  const { id } = await params;
  const registry = await getRegistry();
  const agent = registry.get(id);

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  if (!agent.sourceFile) {
    return NextResponse.json(
      { error: 'Agent has no source file (read-only)' },
      { status: 400 },
    );
  }

  // Verify the file exists
  if (!fs.existsSync(agent.sourceFile)) {
    return NextResponse.json(
      { error: `Source file not found: ${agent.sourceFile}` },
      { status: 404 },
    );
  }

  const updates: AgentUpdates = await request.json();
  let source = fs.readFileSync(agent.sourceFile, 'utf-8');
  const applied: string[] = [];

  try {
    // ── Prompt ──────────────────────────────────────────────────────
    if (updates.prompt !== undefined) {
      source = replaceField(source, 'prompt', updates.prompt, 'multiline');
      applied.push('prompt');
    }

    // ── Description ─────────────────────────────────────────────────
    if (updates.description !== undefined) {
      source = replaceField(source, 'description', updates.description, 'string');
      applied.push('description');
    }

    // ── Status ──────────────────────────────────────────────────────
    if (updates.status !== undefined) {
      source = replaceField(source, 'status', updates.status, 'literal');
      applied.push('status');
    }

    // ── Tags ────────────────────────────────────────────────────────
    if (updates.tags !== undefined) {
      source = replaceTags(source, updates.tags);
      applied.push('tags');
    }

    // ── Config fields ───────────────────────────────────────────────
    if (updates.config) {
      if (updates.config.temperature !== undefined) {
        source = replaceField(source, 'temperature', updates.config.temperature, 'number');
        applied.push('config.temperature');
      }
      if (updates.config.maxTokens !== undefined) {
        source = replaceField(source, 'maxTokens', updates.config.maxTokens, 'number');
        applied.push('config.maxTokens');
      }
    }

    fs.writeFileSync(agent.sourceFile, source, 'utf-8');
    invalidateRegistry();

    return NextResponse.json({ success: true, updated: applied });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  Regex-based field replacement helpers                               */
/* ------------------------------------------------------------------ */

type FieldType = 'string' | 'multiline' | 'number' | 'literal';

function replaceField(
  source: string,
  fieldName: string,
  value: unknown,
  type: FieldType,
): string {
  if (type === 'multiline') {
    // Match template literal:  prompt: `...`,  or  prompt: `...`}
    const templateRe = new RegExp(
      `(${fieldName}:\\s*)\`[\\s\\S]*?\``,
    );
    if (templateRe.test(source)) {
      const escaped = String(value).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
      return source.replace(templateRe, `$1\`${escaped}\``);
    }
    // Fall back to single/double quoted string
    const strRe = new RegExp(`(${fieldName}:\\s*)(['"])[\\s\\S]*?\\2`);
    if (strRe.test(source)) {
      const escaped = String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return source.replace(strRe, `$1'${escaped}'`);
    }
    throw new Error(`Could not find field "${fieldName}" in source file`);
  }

  if (type === 'string') {
    // Match 'value' or "value" (single line)
    const re = new RegExp(`(${fieldName}:\\s*)(['"]).*?\\2`);
    if (re.test(source)) {
      const escaped = String(value).replace(/'/g, "\\'");
      return source.replace(re, `$1'${escaped}'`);
    }
    throw new Error(`Could not find field "${fieldName}" in source file`);
  }

  if (type === 'number') {
    const re = new RegExp(`(${fieldName}:\\s*)[\\d.]+`);
    if (re.test(source)) {
      return source.replace(re, `$1${Number(value)}`);
    }
    throw new Error(`Could not find field "${fieldName}" in source file`);
  }

  if (type === 'literal') {
    // Match 'value' or "value" for enum-like fields
    const re = new RegExp(`(${fieldName}:\\s*)(['"]).*?\\2`);
    if (re.test(source)) {
      return source.replace(re, `$1'${String(value)}'`);
    }
    throw new Error(`Could not find field "${fieldName}" in source file`);
  }

  return source;
}

function replaceTags(source: string, tags: string[]): string {
  // Match tags: ['a', 'b', ...],  or  tags: ["a", "b", ...],
  const re = /(\btags:\s*)\[[\s\S]*?\]/;
  if (!re.test(source)) {
    throw new Error('Could not find "tags" array in source file');
  }
  const formatted = `[${tags.map((t) => `'${t.replace(/'/g, "\\'")}'`).join(', ')}]`;
  return source.replace(re, `$1${formatted}`);
}
