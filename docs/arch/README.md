# Bookflow architecture diagrams (Archify v2.17)

Versioned artifacts: `*.architecture.json`, `*.sequence.json`, `*.workflow.json`,
`*.dataflow.json`, `*.lifecycle.json` specs plus delivered `*.html` and
`*.visual-check.json` receipts.

Regenerate screenshots any time (not committed, see `.gitignore`):

```bash
node .agents/skills/archify/bin/archify.mjs visual-check docs/arch/<name>.html --json
```

Authoring loop per diagram: `validate <type> <spec> --quality showcase --json --repo-root .`
must report 9/9 with 0 errors, then `deliver`, then `visual-check` must pass.
Receipts pin the verified repository revision.
