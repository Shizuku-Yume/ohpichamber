# OMP M0 能力探针与契约复核

**Status:** done
**Priority:** high

## What this is for

OhPiChamber 已经采用 OMP-only 的目标架构，但当前仓库还没有 Agent Service、Canonical Agent contract package 或 `/api/agent/v1` 实现。现有 OMP 行为主要来自源码阅读和设计假设，不能证明会话生命周期、事件终止语义、并发工作目录隔离、审批/问题交互、凭据存储、MCP、skills 或无状态 completion 在实际运行时可用。

如果跳过这一关，后续 Agent Service 和客户端契约会把未验证的 SDK 行为固化成错误协议，尤其可能把 `turn_end` 误当作用户请求完成、把 fetch failure 当成空成功，或让不同 session 的 cwd、凭据和事件互相污染。

## What it does

对选定的 OMP 源快照执行一次可复现、可丢弃的 M0 capability probe，并产出机器可读结果和人工可读报告。报告必须区分：

- 已观察到的行为；
- 明确返回的 unsupported capability；
- 因缺少凭据、平台或外部服务而未执行的项目；
- 失败、崩溃、超时和清理不完整。

探针覆盖：

1. SDK session 创建、prompt、事件订阅、`turn_end` 与 terminal `agent_end`、abort、dispose 和关闭后的迟到事件；
2. history、branch、fork、subagent 和工作区文件不回滚语义；
3. approval、question、pending request 清理和重启后的 fail-closed 行为；
4. 同进程多 session 的 cwd/环境隔离，以及独立 Bun worker 的启动、退出、清理和资源观测；
5. model discovery、AuthStorage/SQLite 路径、凭据格式可行性、MCP 连接/刷新/关闭和 `SKILL.md` discovery；
6. stateless text/structured completion、取消和 provider failure；
7. 原始事件顺序、fragment 密度和可用于后续 Canonical cursor/batching 的观测；
8. 报告脱敏：不写入 API key、bearer token、凭据内容、宿主机绝对路径或完整 prompt/response secret。

允许使用一次由进程环境注入的真实 provider smoke 来补充受控 fixture 结果；凭据、endpoint 和模型选择不能写入仓库文件、日志、报告或示例配置。真实 provider 失败不能被 fixture 结果掩盖。

## How it is built

### 探针边界

探针是一次性验证工具，不是 Agent Service。它运行在隔离的临时 `HOME`、OMP agent directory、workspace 和环境 overlay 中，读取指定的 OMP 源目录或已安装包；不会把 OMP SDK 对象暴露到 OhPiChamber 客户端，也不会引入 OpenCode adapter、fallback engine 或双引擎选择器。

探针使用稳定的结果 envelope：

```text
run:
  sourceRevision, packageVersion, bunVersion, platform, startedAt, command
probes[]:
  id, capability, status, observations, errors, artifacts, redactions
summary:
  passed, failed, unsupported, unavailable, unknown
```

`status` 至少包括 `passed`、`failed`、`unsupported`、`unavailable` 和 `unknown`。单个 provider 或 capability 失败不得覆盖其他 probe 的完整结果。所有 probe 必须有超时、退出码和清理结果。

### 任务边界

- **Probe harness / lifecycle owner：** 建立临时目录、source identity、结果 schema、超时/退出处理和基础 session/event capture；不定义最终 Canonical DTO。
- **Isolation probe：** 测量同进程并发 session 的 cwd/环境污染，并以独立 worker 作为对照；记录 idle/active 资源，不因为一次 Linux 结果宣称跨平台性能保证。
- **Runtime capability probe：** 测量 model/auth、MCP、skills、stateless completion、approval/question 和 provider failure；凭据只来自进程环境或无 secret fixture。
- **Evidence/report owner：** 合并结果、生成脱敏报告，逐项标注 M0 gate；只有被观察到的字段才可写入 `contracts.md`，未知行为继续保留为 gate。

架构继续遵循 ADR-01 的直接 SDK 集成方向和 ADR-03 的保守 worker 隔离方向。探针可以测试同进程并发是否安全，但不能因为测试通过就自动改写 worker 架构。

### 失败与清理

- OMP source、Bun 或依赖不可用：报告 `unavailable`，包含可重现的非敏感原因，不伪造 SDK 结果。
- 真实 provider 不可用或凭据无效：报告 provider-specific `unavailable`/`failed`，仍运行无凭据的结构性 probe。
- worker、MCP server 或 session 未退出：报告 cleanup failure，并以非零退出码结束该 probe；不得静默吞掉孤儿进程。
- 任何结果序列化失败：保留最小安全错误 envelope，不写原始异常对象、环境变量或 SDK 对象。

## What it must not do

- 不实现 `packages/agent-service`、Host Gateway reverse proxy、Canonical Server 或 `/api/agent/v1`。
- 不在本轮迁移 OpenCode client/store/routes、删除 `lib/opencode` 或移除 `packages/vscode`。
- 不把 OMP 源码类型、事件名或现有 OpenCode 事件翻译直接冻结为 Canonical API；运行时证据缺失时保留 proposed/unknown 状态。
- 不把真实 provider 的 API key、endpoint、模型名、请求内容或返回内容写入仓库、`.workflow` 文档、测试 fixture、日志或提交。
- 不宣称 macOS、Windows、Electron、mobile、Docker containment、远程 relay 或任何未实际运行的 provider 已验证。
- 不增加 application workspace dependency；OMP 依赖只在其选定的外部 source/临时环境中准备。

## What was considered and rejected

- **先实现 Agent Service，再边跑边修契约。** 这样能尽快出现可调用的进程，但会把未经验证的 session、event、approval 和 shutdown 假设扩散到多个边界；M0 gate 明确要求先观察真实 SDK 行为。
- **只依据 OMP TypeScript 类型和源码阅读冻结契约。** 类型能说明调用形状，不能证明 provider failure、事件顺序、并发 cwd、迟到事件和资源清理；因此必须有运行时报告。
- **只用真实 provider 测试。** 真实调用能补充 provider/auth 证据，但不能提供确定性事件、错误和取消覆盖，且凭据与网络会使 probe 不可复现；以受控 fixture 为基础，真实 provider 作为显式附加结果。
- **使用 OMP CLI/RPC 代替 SDK probe。** CLI/RPC 会改变进程、事件和工具边界，不能回答目标架构要求的直接 SDK 集成问题；M0 保持 ADR-01 的 SDK 方向。

## How we will know it works

- **W1.** 一次命令能记录实际 source revision、包版本、Bun 版本、平台、隔离目录和退出状态；缺少 source/依赖时明确失败，不生成成功报告。
- **W2.** 受控模型下能记录 session 创建、prompt、事件顺序、`turn_end`、terminal `agent_end`、abort、dispose 和关闭后的事件计数；报告能证明或否定 outer request completion 语义。
- **W3.** 能加载 history，观察 branch/fork/subagent 行为，并证明 branch/fork 不自动回滚 workspace 文件；失败项保留原因和临时文件清理结果。
- **W4.** approval/question 的 pending、resolve、cancel/restart cleanup 结果可观察；无法在当前 SDK 或无交互环境验证时标为 unsupported/unavailable，而不是空成功。
- **W5.** 同进程并发 session 的 cwd/环境隔离和独立 worker 的启动、关闭、孤儿进程检查都有结果；idle/active RSS 或等价资源观测带有平台与测量限制。
- **W6.** model discovery、AuthStorage/SQLite、MCP、skills、stateless text/structured completion、取消和 provider failure 各有结果；凭据 feasibility 按 provider 分项，不输出 secret。
- **W7.** 报告记录原始事件顺序、fragment density、cursor/batching 相关观测，并将未知行为保留为 gate；没有用 OpenCode 事件名或空数组代替缺失证据。
- **W8.** `contracts.md` 和 `development.md` 的更新只引用报告中已观察到的行为；报告、日志和 artifacts 通过脱敏检查，不包含 API key、bearer token、完整 endpoint secret 或宿主机绝对路径。

验证层级：probe 运行负责 SDK、进程、事件、凭据边界和清理；脚本级测试负责结果 envelope、脱敏、失败隔离和报告合并；文档校验负责链接和 workflow 结构。静态 type-check 不能替代这些运行时证据。

## Open questions

无阻塞的用户决策。共享进程是否安全、哪些 capability 可用以及哪些 provider credential 可迁移，均由实际 probe 结果决定；未知结果继续作为 M0 gate，不通过猜测解决。

## Notes

- 目标范围来自 `.workflow/omp-migration/implementation-plan.md` 的 M0；产品边界遵循 `scope.md`，协议草案遵循 `contracts.md`，进程边界遵循 `architecture.md`。
- OMP source identity 以当前 development record 的 acquisition evidence 为起点，但任务运行时必须重新记录实际 source/package identity。
- 本仓库根 `.gitignore` 忽略 `/secret/`，但不会创建或写入任何 secret 文件；测试凭据只能通过临时进程环境注入。
