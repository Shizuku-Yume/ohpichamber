# 04: 合并 M0 报告并复核迁移契约

**Effort:** omp-m0-probe
**Task type:** feature
**Base commit:** <commit-sha>
**Started:** 2026-10-11

**Delivers:** 脱敏的 M0 machine-readable/human-readable evidence report，并根据实际观测更新 development record 和 Canonical contract 的 verified/proposed/unsupported 状态。

**Blocked by:** 01, 02, 03
**Files:** `.workflow/omp-migration/m0/` 报告与 schema、`.workflow/development.md`、`.workflow/omp-migration/contracts.md`，必要时探针报告脚本

**Read first:**
- `.workflow/specs/omp-m0-probe.md`：W7、W8、Notes
- `.workflow/omp-migration/implementation-plan.md`：M0 gate
- `.workflow/omp-migration/contracts.md`：M0 obligations、event/cursor、approval、completion 和 unsupported semantics
- `.workflow/development.md`：当前证据写法与未验证项
- Tasks 01-03 的输出 envelope 和 artifacts

**Covers:** W7, W8

**Check:** `bun run <report-command> --input <probe-artifacts> --output <report-dir>` → exit 0，生成脱敏 JSON/Markdown 报告；`bun run docs:validate` 通过；报告中每个 M0 capability 都有结果，契约只吸收有运行证据的行为，未知项仍标为 gate。

- [x] 合并各 suite 结果，保留每个 probe 的 status、observations、errors、artifacts、cleanup 和 limitations。
- [x] 检查并拒绝 API key、bearer token、凭据内容、完整外部 endpoint、宿主绝对路径和敏感 prompt/response 泄漏。
- [x] 生成报告摘要，区分 passed、partial、failed、unsupported、unavailable、unknown；单项失败不得抹掉其他完整结果。
- [x] 更新 `.workflow/development.md` 的当前状态、M0 evidence、source identity、已验证项、未验证项和下一步；不提前关闭 M0 gate。
- [x] 仅把已观察到的稳定行为写入 `contracts.md`；保持 proposed/unknown 语义，删除或改正与报告冲突的断言。
- [x] 在报告中保留真实 provider、平台、Docker、mobile 等未执行限制。
- [x] 运行 workflow/docs 校验。
 

## Progress

2026-10-11: Reconciled the [lifecycle fixture](../../omp-migration/m0/lifecycle.json), [capabilities fixture](../../omp-migration/m0/capabilities-fixture.json), [real-provider capability artifact](../../omp-migration/m0/capabilities-real-provider.json), and [isolation fixture](../../omp-migration/m0/isolation-artifact.json) into the development record and proposed Canonical contract. The pinned OMP 18.8.9 revision `c9de2b02...` was exercised on Linux x64. Lifecycle passed 9, fixture capabilities recorded 8 passed and 5 partial, the real-provider suite recorded 9 passed and 5 partial with its provider probe passed, dedicated workers passed, all shared-process cwd/env modes failed, and the 100 MiB idle RSS budget failed. Focused runner/process-group/pidfd cleanup tests passed.

The report envelope now uses schema version 2 and counts partial parent probes explicitly. A partial capability makes the suite exit nonzero, so automation cannot mistake unresolved child evidence for a complete pass. The preparation metadata now references all canonical runtime artifacts and states the one credentialed smoke plus its limits.

The real-provider artifact records one authenticated `openai-completions` completion with `stopReason: "stop"` and reported usage. It uses process-injected credentials only; the report contains no key, bearer token, full endpoint, host path, prompt, or response body. The provider base URL requires the `/v1` suffix. Non-Linux behavior, restart-pending recovery, broader external network behavior, mobile/Electron/host relay, Docker, and other non-exercised gates remain unproven. M0 remains open.

Validation passed: `bun run docs:validate` reported 696 pages and 58 sidebar links; `.workflow/bin/workflow validate --no-color` reported 9 valid task files; all M0 tests passed 38 tests with 187 assertions. Fixture and real-provider suite exits are nonzero by design because they contain partial evidence.
