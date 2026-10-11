# 01: 建立 M0 探针基础与 session 生命周期证据

**Effort:** omp-m0-probe
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** 一条可复现的 disposable probe 命令，能在隔离临时环境中识别实际 OMP source/package/Bun，执行受控 session 生命周期并产出脱敏结果 envelope。

**Blocked by:** None
**Files:** `scripts/omp-m0/`、`.workflow/omp-migration/m0/`（探针基础与 fixture）

**Read first:**
- `.workflow/specs/omp-m0-probe.md`：探针边界、结果 envelope、W1-W3
- `.workflow/omp-migration/architecture.md`：ADR-01、ADR-03、M0 probe table、turn completion semantics
- `.workflow/omp-migration/contracts.md`：single state authority、no silent empty success、event cursor obligations
- `/home/shizuku/Project/oh-my-pi/packages/coding-agent/examples/sdk/README.md`
- `/home/shizuku/Project/oh-my-pi/packages/coding-agent/examples/sdk/01-minimal.ts`
- `/home/shizuku/Project/oh-my-pi/packages/coding-agent/examples/sdk/11-sessions.ts`

**Covers:** W1, W2, W3

**Check:** `OMP_SOURCE_DIR=<source> bun run <probe-command> --suite lifecycle --fixture --output <temp-report>` → exit 0，报告包含 source identity、session/event/abort/dispose/history/branch/fork/subagent 结果；缺依赖或 fixture 失败时退出非零且只输出脱敏 error envelope。

- [x] 建立临时 HOME、agent directory、workspace 和清理逻辑；不读取或持久化真实凭据。
- [x] 记录实际 source revision/package version/Bun/platform/command，拒绝缺失或不匹配的 source identity。
- [x] 提供确定性的受控模型/fixture seam，捕获完整事件序列、时间戳、顺序和 fragment density。
- [x] 验证 `turn_end` 与 terminal `agent_end` 的区别，覆盖 prompt、abort、dispose、关闭后迟到事件。
- [x] 覆盖 history、branch、fork、subagent 的可观测结果，并检查 branch/fork 不改 workspace 文件。
- [x] 统一输出 schema、超时、退出码、清理状态和安全序列化；不写 API key、endpoint secret、完整 prompt/response 或绝对路径。
- [x] 为后续 isolation/runtime probe 提供稳定的 suite runner 和结果 envelope，不冻结 Canonical DTO。
