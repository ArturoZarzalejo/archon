---
name: lint-check
description: Run the Archon linter against agents and report health scores. Use when checking agent quality or before commits.
allowed-tools: "Bash(npx tsx *)"
argument-hint: [--strict]
---

Run the Archon linter and report results.

```bash
npx tsx src/cli/index.ts lint $ARGUMENTS
```

Parse the output and report:
- Total agents found
- Per-agent health score
- Critical issues (with file paths and fix suggestions)
- Pass/fail summary

If `--strict` is passed, warnings also cause failure.
