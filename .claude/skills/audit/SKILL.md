---
name: audit
description: Run a comprehensive health audit of the Archon project. Use before releases or to check project status.
allowed-tools: "Bash(find *) Bash(grep *) Bash(npx *) Bash(cat *) Bash(wc *) Bash(ls *) Bash(git *) Read Glob Grep"
---

Run a full audit of the Archon project:

1. Count source files, components, API routes, pages
2. Check TypeScript: `npx tsc --noEmit`
3. Run linter: `npx tsx src/cli/index.ts lint`
4. Verify npm packaging (license, files, keywords, exports)
5. Check docs are up to date
6. Verify mock data covers schema fields
7. Check git status (clean/dirty)

Report as:
```
══════════════════════════════
  ARCHON AUDIT REPORT
══════════════════════════════
Files:        X source files ✓/✗
TypeScript:   X errors ✓/✗
Lint:         X agents, X critical ✓/✗
npm:          all fields present ✓/✗
Docs:         X files ✓/✗
Git:          clean/dirty ✓/✗

Overall: READY / NEEDS WORK
```
