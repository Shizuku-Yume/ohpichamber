# Product documentation source

This directory contains product documentation for OpenChamber powered by the Oh My Pi (OMP) agent runtime.

OhPiChamber uses Oh My Pi (OMP) as its production agent runtime, supporting Web/PWA, Electron desktop, Mobile, and the Guest SDK. The Node.js Host Gateway supervises the Bun Agent Service and serves the Canonical `/api/agent/v1` API. M4 core orchestration adaptations (workflows, auto model routing, permissions, MCP, settings, TUI parity, scheduled tasks, and multi-run) are verified on the OMP runtime; notifications (Linear OAuth external account blocked) and sessions-in-work (live worktree sessions uncertified) retain unverified notes until end-to-end certification is complete. Mobile device certification and the standalone npm runtime are not yet verified.

## Layout

- `content/docs/*.mdx`: English docs pages (source of truth)
- `content/docs/<locale>/*.mdx`: translations mirroring English filenames (`uk/`, `zh-cn/`, `pt-br/`, `fr/`, `tr/`); see `CONTRIBUTING.md`
- `sidebar.config.json`: docs navigation structure for the Starlight sidebar
- `CONTRIBUTING.md`: authoring guide for adding pages, sections, and translations
- `DEPLOYMENT.md`: packaging and sync trigger model

## Local validation

Run from repo root:

```bash
bun run docs:validate
```

This validates:

- frontmatter (`title`, `description`) exists for every MDX page
- sidebar links resolve to existing MDX routes

## Deployment model

This repository owns documentation content.

Website rendering and deployment occur in `openchamber-website` (`apps/docs`).

Use `.github/workflows/docs-source.yml` to package docs source on release or manual trigger.
