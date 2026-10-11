# 03: 验证 OMP runtime capability 与 provider 边界

**Effort:** omp-m0-probe
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** model/auth、approval/question、MCP、skills、stateless completion 与 provider failure 的分项 M0 证据，并明确 unsupported/unavailable 行为。

**Blocked by:** 01
**Files:** `scripts/omp-m0/` 中的 capability probe、无 secret fixture 与 provider adapter；`.workflow/omp-migration/m0/` 中的 capability artifact

**Read first:**
- `.workflow/specs/omp-m0-probe.md`：W4、W6、W8、凭据边界
- `.workflow/omp-migration/implementation-plan.md`：M0 capability list、credential feasibility、stateless completion
- `.workflow/omp-migration/contracts.md`：approval/question、unsupported capability、no silent empty success
- `.workflow/omp-migration/architecture.md`：MCP 与 skills migration、AuthStorage 边界
- `/home/shizuku/Project/oh-my-pi/packages/coding-agent/examples/sdk/README.md`
- `/home/shizuku/Project/oh-my-pi/packages/coding-agent/examples/sdk/04-skills.ts`
- `/home/shizuku/Project/oh-my-pi/packages/coding-agent/examples/sdk/09-api-keys-and-oauth.ts`
- `/home/shizuku/Project/oh-my-pi/packages/coding-agent/src/session/auth-storage.ts`
- Task 01 的 runner、fixture 和结果 envelope

**Covers:** W4, W6

**Check:** `OMP_SOURCE_DIR=<source> OMP_M0_PROVIDER_API_KEY=<process-only> OMP_M0_PROVIDER_BASE_URL=<process-only> OMP_M0_PROVIDER_MODEL=<process-only> bun run <probe-command> --suite capabilities --fixture --real-provider --output <temp-report>` → exit 0，报告逐项列出 model discovery、AuthStorage/SQLite、approval、question、MCP、skills、text/structured completion、cancel 和 provider failure；真实 smoke 只读取进程环境；不可用项为显式状态且不写 secret。

- [x] 用临时 agent directory 验证 AuthStorage/SQLite 路径、reload、provider 发现和凭据格式可行性；fixture 不包含真实 token。
- [x] 通过 headless UI/context seam 或等价受控路径观察 approval/question 请求、resolve/cancel/restart cleanup；无法支持时输出 unsupported/unavailable。
- [x] 验证 MCP 的发现、连接、工具投影、刷新/重连能力和 shutdown；不得把未验证的动态 reload 报成成功。
- [x] 验证 global/workspace `SKILL.md` discovery、过滤和 session 注入边界。
- [x] 验证无状态 text/structured completion、取消、模型不可用和 provider failure；真实 provider smoke 只能读取进程环境，禁止写入文件或报告。
- [x] 不把任何 OMP 类型、OpenCode shape 或空列表写成 Canonical contract；所有未知行为带证据位置和限制。
2026-10-11: Added the `--real-provider` smoke path. A no-credential run reached the pinned OMP 18.8.9 source and reported `REAL_PROVIDER_ENV_UNAVAILABLE`. With process-injected credentials the run passed: 14 probes, one authenticated `openai-completions` completion, `stopReason: "stop"`, usage reported, recorded in [capabilities-real-provider.json](../../omp-migration/m0/capabilities-real-provider.json). The provider base URL needs the `/v1` suffix.
