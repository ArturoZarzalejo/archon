# /lint-check

Run the Archon linter against the project's own example agents and report results.

## Steps
1. Run `npx tsx src/cli/index.ts lint` from the project root
2. Parse the output for pass/fail counts
3. Report: total agents, critical issues, warnings, health scores
4. If any critical issues found, suggest specific fixes with file paths

## Usage
```
/lint-check
/lint-check --strict
```
