/**
 * Standalone script — executed via `tsx` subprocess.
 * Loads a TS/JS file, imports its default export, and prints JSON to stdout.
 *
 * Usage: npx tsx _loader.ts <file-path>
 * Usage: npx tsx _loader.ts --scan <rootDir> <glob1> <glob2> ...
 * Usage: npx tsx _loader.ts --markdown <rootDir> <glob1> <glob2> ...
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);

if (args[0] === '--markdown') {
  // Markdown scan mode: parse .md files for agent metadata
  const rootDir = args[1];
  const patterns = args.slice(2);
  const { scanMarkdownFiles } = await import('./markdownScanner.js');
  const agents = await scanMarkdownFiles(rootDir, patterns);
  console.log(JSON.stringify(agents));
} else if (args[0] === '--scan') {
  // Scan mode: load multiple agent files
  const rootDir = args[1];
  const patterns = args.slice(2);
  const fg = await import('fast-glob');
  const files = await fg.default(patterns, {
    cwd: rootDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**'],
  });

  const agents: unknown[] = [];
  for (const file of files) {
    try {
      const mod = await import(pathToFileURL(file).href);
      const def = mod.default ?? mod;
      if (def && typeof def === 'object' && 'id' in def && 'name' in def) {
        agents.push({ ...def, sourceFile: file });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[archon] Failed: ${path.relative(rootDir, file)} — ${msg}`);
    }
  }
  console.log(JSON.stringify(agents));
} else {
  // Single file mode: load config
  const filePath = args[0];
  const mod = await import(pathToFileURL(filePath).href);
  const def = mod.default ?? mod;
  console.log(JSON.stringify(def));
}
