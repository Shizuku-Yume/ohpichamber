# Glossary

What things in this project are called, and what those words mean.

One entry per concept. If two people would use the word differently, that is a
bug in the project, not in the conversation: fix it here.

Add a term the moment it is agreed, not later. A name that exists only in a
conversation is a name that will drift. Git merges this file with the union driver
(`.gitattributes`), so parallel branches can each add terms.

## Format

```markdown
- **Term**: what it means, in one sentence, ideally naming where it shows up in the
  code.
- _Avoid_: words that mean the same thing but should not be used (optional; omit if no synonyms exist).
```

The `Avoid` line does real work when it exists. "Order" and "Purchase" being two
names for one thing is a common source of confusion. But if a concept has no
competing names, omit the line rather than inventing fake synonyms.

## Terms

- **Host Gateway**: retained host authority for machine services and client API access, defined in [architecture ADR-02](omp-migration/architecture.md#adr-02-strict-process-separation-between-nodejs-host-gateway-and-bun-agent-service).
- **Agent Service**: proposed private Bun OMP execution supervisor, not the existing OpenCode server, defined in [architecture ADR-01](omp-migration/architecture.md#adr-01-direct-omp-sdk-integration-inside-a-dedicated-bun-agent-service).
- **Canonical API**: proposed agent protocol exposed to clients through the Host Gateway under `/api/agent/v1`, owned by [contracts.md](omp-migration/contracts.md).
- **Guest SDK**: third-party extension contract in `packages/sdk`, distinct from the canonical agent contract; see its [module documentation](../packages/sdk/DOCUMENTATION.md).
- **Space**: isolated container holding an agent and project copy, defined in the inherited [design vocabulary](isolated-spaces/DESIGN.md#words).
- **Place**: container runtime where spaces run, defined in the inherited [design vocabulary](isolated-spaces/DESIGN.md#words).
- **Gatekeeper**: a space's separate egress container, distinct from host authorization checks, defined in the inherited [design vocabulary](isolated-spaces/DESIGN.md#words).
- **Upstream rebaseline**: adoption of one freshly pinned upstream application/runtime/dependency/build revision followed by preservation and restoration of OhPiChamber customization, as defined in the [current effort spec](specs/upstream-rebaseline.md).
- **Upstream-first area refresh**: take a current upstream area's source at the pinned revision as the baseline, then restore OhPiChamber customizations path by path, as defined in the [refresh spec](specs/upstream-refresh.md).
- _Avoid_: cherry-pick, merge (for this operation).
- **Session mode**: how OMP runs a session's main conversation, one of main, plan, vibe or goal; held by OMP and projected as `SessionMode` in the session snapshot, defined in the [OMP-native chat spec](specs/omp-native-chat.md#session-mode).
- _Avoid_: agent, persona (OMP has no root agent).
- **Worker-originated run**: a canonical run the Agent Service worker opens for a turn OMP started without a Host prompt, marked by `origin`, defined in the [OMP-native chat spec](specs/omp-native-chat.md#worker-originated-runs).
