# 22: Boot hydration registry, unknown state and same-source freshness (R4)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 19
**Covers:** W5
**Files:** `packages/ui/src/stores/serverStateBoot.ts` (new); `packages/ui/src/stores/{permissionStore,useAgentMemoryStore,useGitIdentitiesStore,useQuotaStore,useWebSearchStore,useSessionFoldersStore,useAdvisorStore,useCleanseStore}.ts`; `packages/ui/src/sync/{sync-context.tsx,event-reducer.ts,permission-mode-sync.ts,host-session-status-seed.ts}`; `packages/ui/src/lib/{sessionAssistMetadata,sessionWorkMetadata}.ts`; `packages/ui/src/utils/permissionAutoAccept.ts`; `packages/ui/src/App.tsx`; `packages/ui/src/apps/{MobileApp,ElectronMiniChatApp}.tsx`; `packages/ui/src/components/chat/ChatInput.tsx` (draft permission default only); `packages/ui/src/lib/runtimeEndpointReset.ts`; `packages/agent-service/src/worker/session.ts` (`scheduleAutoTitle`)
**Read first:** `research/ux-v270-systemic-review.md` R4; `packages/ui/src/sync/DOCUMENTATION.md`; `packages/ui/src/stores/DOCUMENTATION.md`; skill `sync-state-invariants`
**Check:** `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/stores packages/ui/src/sync packages/ui/src/lib && bun --cwd packages/agent-service test && bun run lint` → exit 0, with the boot-registry test, the unknown-entity reducer test and the auto-title re-arm test passing; real path: restart with default permission mode `auto` → the composer shield shows auto before any click; a new session's generated title reaches the sidebar without reload; a next-prompt suggestion survives touching the session file

- [ ] Add a boot registry: each store projecting server or global config declares its hydrator and reset. Boot runs the hydrators on every app root (main, mobile, mini-chat), and `runtimeEndpointReset` uses the same registry instead of its hand list.
- [ ] Store state carries `unknown | ready | error`. Consumers render a neutral affordance while unknown instead of `'ask'`, `0` or `false`. The new-session draft takes the configured default permission mode. `resolvePermissionMode` stops returning `ask` for "not read".
- [ ] Reducers upsert or buffer `session.updated` and metadata events for sessions they do not hold yet.
- [ ] Freshness checks compare same-source ordering only. No Host `Date.now()` against native file mtime, and no client clock against a server revision.
- [ ] `scheduleAutoTitle` re-arms after a superseding prompt, so an untitled session always gets a title.
- [ ] Add guardrails: a boot-registry test enumerating server-config stores; an unknown-entity test applying each canonical event to an empty state; a lint rule against `>= session.updatedAt`-style cross-source comparisons.
- [ ] Deletes: `permission-mode-sync.ts` as an orphan path (folded into the registry), the second readers of `defaultGitIdentityId` and quota selections, and per-store "hydrate when the Settings page mounts" paths.
