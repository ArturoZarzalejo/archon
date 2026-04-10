# /audit

Run a comprehensive audit of the Archon project and report on code health, completeness, and readiness.

## Steps
1. Count source files, components, API routes, pages
2. Verify all CLI commands work (dev, init, build, lint)
3. Check for TypeScript errors (`npx tsc --noEmit`)
4. Check for dead code and unused imports
5. Verify mock data covers all schema fields
6. Verify docs are up to date with schema
7. Check npm packaging (license, files, keywords, exports)
8. Run the linter against example agents
9. Report a summary with pass/fail per category

## Output format
```
══════════════════════════════
  ARCHON AUDIT REPORT
══════════════════════════════

Files:        90 source files ✓
TypeScript:   0 errors ✓
CLI:          5/5 commands ✓
Docs:         4 files, up to date ✓
npm:          all fields present ✓
Lint:         4 agents, 0 critical ✓
Schema:       13 sub-schemas, 118 fields ✓

Overall: READY / NEEDS WORK
```

## Usage
```
/audit
```
