# Retrospective: omp-m0-probe

## Goal
在固定的 OMP 源快照上运行一次可丢弃、可复现的 M0 探针，记录 session、隔离、runtime capability、provider 和脱敏边界，再用实际证据复核 proposed Canonical contract。该 effort 不实现 Agent Service，也不关闭更大的 M0 运行时 gate。

## What shipped
- W1-W3：lifecycle 探针记录了 pinned source identity、OMP 18.8.9、Bun、平台、session 生命周期、事件终止语义、abort/dispose、history、branch、fork 和 subagent 行为。fixture 通过 9 个 probes。
- W4、W6：capability fixture 记录 8 个 passed、5 个 partial probes，覆盖 AuthStorage/SQLite、approval/question、MCP、skills、text/structured completion、cancel 和 provider failure。真实 provider smoke 记录 9 个 passed、5 个 partial probes，其中 real-provider probe 本身通过一次 `openai-completions` 认证请求，返回 `stop` 并报告 usage。凭据只通过进程环境注入。
- W5：独立 worker 启动、关闭、清理和 process-group 检查通过；同进程 ambient cwd/environment 隔离失败，100 MiB idle RSS 假设也失败。报告保留这些失败，没有改写成成功。
- W7-W8：报告保留事件顺序、fragment/cursor 相关观测和限制；`development.md`、`contracts.md` 只吸收已观察行为，未知语义仍是 proposed 或 gate。脱敏检查、文档校验和 workflow 校验通过。

## Decisions that shaped it
- 先运行 M0 probe，再冻结 Canonical contract。SDK 类型和 OpenCode 事件名不能替代运行时证据。
- 独立 worker 是当前更安全的隔离方向。共享进程的 cwd/environment 失败结果不改变 ADR-03，但阻止把共享进程当作已验证方案。
- 真实 provider 只作为显式附加 smoke。一次成功请求不代表 provider discovery、tools、cancel、quota、retry 或跨平台支持。

## Plan versus actual
- Tasks at break: 4. Added later: 0. Split: 0. Dropped: 0.
- Spec changes after confirmation: 0.
- Tasks that went `blocked`: none.

## Review findings
两份自动复核均无 blocking finding。需求复核发现 parent status 和 summary 会把 approval restart cleanup、MCP dynamic reload、skills direct slash expansion、credential authentication/migration 的 partial evidence 汇总成 passed；已加入 `partial` 状态、schema version 2、非零退出和回归测试。质量复核发现 preparation metadata 没有引用真实 provider artifact且仍声明没有 credentialed smoke；已更新 runtimeEvidence 和 limits。计数、链接和限制现与 artifacts 一致。

## What changes
新增 `partial` summary/status 回归检查，报告 schema 从 1 升为 2；更新 preparation metadata，使 credentialed smoke 与 broader provider limits 成为单一证据记录。现有 workflow/docs validation、focused M0 tests、artifact 脱敏扫描和各 suite smoke 已覆盖本 effort 的可执行边界。

## Debt left behind
更大的 M0 gate 仍开放：非 Linux、restart-pending recovery、更广的 external network、mobile/Electron/host relay、Docker containment、packaged updater、Web/PWA self-navigation confidentiality，以及 native remote-host 和 authenticated Board 行为。`development.md` 继续维护这些限制；本 effort 不把它们改写成已验证。

## Reopened 2026-10-11

### What triggered it
两份收尾复核都没有 blocking finding，但指出两个会影响自动消费者的证据问题：parent capability status 将 unresolved child evidence 汇总成 passed，preparation metadata 仍声明没有 credentialed provider smoke。

### What changed
报告加入 `partial` status，schema version 升为 2；包含 partial 的 suite 返回非零退出，并增加 envelope/capability 回归测试。四个 canonical M0 artifacts 已重新生成。preparation metadata 现在引用完整 runtime evidence，并准确记录一次 credentialed completion 与 broader provider limits。

### Verification
全部 M0 tests 通过 38 tests、187 assertions；oxlint、dead-code、workflow validation 和 docs validation 通过。fixture capability summary 为 8 passed、5 partial；real-provider summary 为 9 passed、5 partial；provider probe 本身仍为 passed。
