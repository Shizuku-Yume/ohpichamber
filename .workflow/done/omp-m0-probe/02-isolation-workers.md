# 02: 测量并发 session 与 worker 隔离

**Effort:** omp-m0-probe
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** M0 并发与 worker 隔离证据，明确不同 cwd/环境的 session 是否会污染，并记录独立 Bun worker 的启动、资源和退出行为。

**Blocked by:** 01
**Files:** `scripts/omp-m0/` 中的 isolation probe、worker launcher、资源采样与测试；`.workflow/omp-migration/m0/` 中的 isolation artifact

**Read first:**
- `.workflow/specs/omp-m0-probe.md`：W5、失败与清理
- `.workflow/omp-migration/architecture.md`：ADR-03、`PROBE-01`、`PROBE-02`、cwd/worker 假设
- `/home/shizuku/Project/oh-my-pi/packages/coding-agent/src/sdk.ts`：`createAgentSession`、`AgentRegistry`、cwd 相关 options
- `/home/shizuku/Project/oh-my-pi/packages/utils/src/dirs.ts`
- Task 01 的 runner、fixture 和结果 envelope

**Covers:** W5

**Check:** `OMP_SOURCE_DIR=<source> bun run scripts/omp-m0/run.mjs --suite isolation --fixture --output <temp-report>` → 报告包含同进程并发 cwd/环境结果、worker RSS/生命周期观测和孤儿进程检查。隔离、binding、退出、清理或 100 MiB idle RSS 假设失败时必须 exit 1；观测到的污染不能改写成成功。无法采样或检查的平台项标为 `unavailable`，仍非零退出。

- [x] 创建至少两个临时 workspace/环境 overlay，并并发运行不同 cwd 的 session。
- [x] 通过受控 read/tool 或等价可观察路径确认相互之间没有 cwd/环境泄漏；失败时保存安全诊断。
- [x] 覆盖 private AgentRegistry/bind-process-state 等相关选择的实际效果，但不因为 probe 通过自动改变 ADR-03。
- [x] 启动并关闭独立 Bun worker，记录 PID、启动/退出、清理和关闭后事件计数。
- [x] 在当前平台记录 idle/active 资源观测、采样方法和限制；不把单平台数字写成跨平台保证。
- [x] 对异常退出、超时和残留进程 fail closed；报告不包含 secret 或宿主绝对路径。

## Implementation handoff

- `isolation.mjs` 在当前工作树运行三种同进程配置和两个独立 Bun worker。配置覆盖默认 registry、private registry、`bindProcessState` 启用和关闭；受控 SDK custom tool 同时读取 session-relative、process-relative workspace marker 和公开 fixture environment marker。
- 独立 worker 分别保留 startup、idle/active 采样、result、shutdown 和 cleanup。某个 worker 失败不会抹掉另一个 worker 的已完成结果。binding 和 dispose 后恢复序列也参与失败判定。
- 每批已完成 probe 通过安全序列化和 atomic rename 写入临时 `result.json` checkpoint。runner 的取消/超时路径必须读取已有 checkpoint，再追加失败结果。嵌套 worker 使用 `detached: false`，由 runner 完整 suite process-group sweep 补充 tracked-descendant 检查。
- 资源采样是 Linux procfs 的 point-in-time RSS、累计 CPU ticks 和线程数。100 MiB 是 ADR-03/PROBE-02 的待验证 idle 假设，不是性能承诺；超出预算是 `failed`。非 Linux orphan inspection 和 procfs metrics 是 `unavailable`，不能伪造成功。
- Linux 的单 worker termination 使用 Bun 内置 FFI 调用 libc `pidfd_open`/`pidfd_send_signal`。先获取 kernel process handle，再核对 birth ticks，所有路径关闭 pidfd。缺少 glibc/kernel 支持时 fail closed，禁止退回 numeric-PID signal。已由 focused isolation/pidfd tests 和真实 fixture 运行验证。
- `isolation-artifact.json` 已由当前集成代码和 pinned OMP fixture 重生成；同进程污染、100 MiB idle RSS 超预算与 dedicated worker 成功均保留为各自状态，不将失败改写成成功。
- 当前集成验证：36 个 M0 focused tests、179 assertions 通过；12 个 changed-file oxlint 规则通过。真实 isolation fixture 在 Linux x64 清理和 process-group verification 通过，但 suite 按预期以 exit 1 报告共享进程污染和 RSS 超预算。
