# Docs Source Packaging

OhPiChamber documentation lives in `packages/docs/` and is read directly on GitHub; there is no separate website deployment.

## Workflow

Use `.github/workflows/docs-source.yml`.

Triggers:

- push to `main` when docs source changes
- release published
- manual `workflow_dispatch`

Outputs:

- validates docs (`bun run docs:validate`)
- creates `openchamber-docs-source-<sha>.tar.gz`
- uploads archive as workflow artifact
- on release or manual `workflow_dispatch` with `release_tag`, uploads archive to release assets
