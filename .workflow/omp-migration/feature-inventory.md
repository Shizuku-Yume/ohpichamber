# OpenChamber 功能全量盘点与 OMP-only 映射结论

> Historical research from the pre-adoption source, not the current update policy: this inventory preserves the earlier application inspection and OMP mapping. The [latest-upstream rebaseline](../specs/upstream-rebaseline.md) comes first, including its updated runtime and features; re-audit coverage and mapping against the refreshed source afterward. The exclusions below describe the final OMP target, not a requirement to freeze the old runtime. The version and commit below are historical baseline details for this research. Preserve useful findings and remove obsolete application-version framing when the newer source has been verified and the document review is complete.

- 历史基准版本（本次研究）：OpenChamber `v1.24.2`
- 历史基准 commit（本次研究）：`336e19248fa0bc0bd9d3bd843e1057d4e2cf62e7`
- 目标架构：`OMP SDK / OMP Agent Service + OpenChamber Canonical API`
- 迁移原则：不兼容 OpenCode；不保留 OpenCode API、配置格式、CLI 生命周期、代理层或兼容分支

## 1. 最终结论

OpenChamber 不是单纯的 OpenCode UI。它由四层组成：

```text
OpenChamber UI
  ├─ Web / Electron / Mobile / VS Code / Guest
  └─ Chat / Files / Git / Diff / Terminal / Settings / Surfaces

OpenChamber Host Service
  ├─ FS / Git / Worktree / PTY
  ├─ Auth / Passkey / Pairing
  ├─ Tunnel / Relay / Dev Tunnel
  ├─ Notifications / TTS / STT
  └─ Extensions / Guest Sandbox

OpenChamber Agent Service
  ├─ Sessions / Messages / Parts / Streaming
  ├─ Approval / Question / Queue
  ├─ Goals / Assist / Routing / Memory
  └─ Scheduled Tasks / Multi-run / Fusion

OMP
  ├─ Model Registry / Auth
  ├─ Agent Sessions / Runs
  ├─ Tools / Approval
  ├─ MCP / Skills
  └─ Streaming / Persistence
```

### 1.1 分类原则

| 分类 | 处理方式 |
|---|---|
| 直接保留 | 功能和 OpenCode 无关，原代码或 UI 可继续使用 |
| 保留并映射 | 产品能力保留，底层调用切换至 Canonical API / OMP |
| 重写 | 当前实现深度依赖 OpenCode 数据结构或事件协议 |
| 抛弃 | 只有 OpenCode 才有，OMP-only 下没有产品价值或无后端基础 |
| 待决 | 需要额外产品取舍或 OMP 能力确认 |

### 1.2 总体比例

这是架构评估，不是代码行数统计：

- 直接保留：约 50%～60%
- 保留功能、重写协议：约 30%～40%
- 彻底抛弃：约 10%～15%

UI 复用率会很高，但 Session、消息、Tool、权限、配置、事件和持久化数据面不能直接复用 OpenCode 实现。

## 2. 产品入口与多宿主

### 2.1 Web / Desktop 主应用

主要模块：

- `packages/ui/src/App.tsx`
- `packages/ui/src/components/layout/MainLayout.tsx`
- `packages/web/server`

功能：

- 应用启动与初始化
- Canonical Server 连接
- Session 同步
- 全局事件订阅
- 错误恢复
- 主布局装载
- 多项目与多目录切换

| 功能 | 决策 | 说明 |
|---|---|---|
| 主界面布局 | 直接保留 | 与 Agent 引擎无关 |
| 启动初始化 | 重写 | 改为 Canonical API / Agent Service readiness |
| SyncProvider | 重写 | 不再消费 OpenCode SDK / SSE |
| Session 恢复 | 重写 | 改为 Canonical Session Recovery |
| OpenCode 服务探测 | 抛弃 | 不再启动或探测 OpenCode |
| OpenCode 进程恢复弹窗 | 抛弃 | 由 Agent Service 状态替代 |
| Canonical Server reconnect | 新增 | 需要统一断线、重试、重同步机制 |

建议的启动边界：

```text
App
 └─ Canonical Client
     ├─ health()
     ├─ negotiate()
     ├─ capabilities()
     ├─ reconnect()
     └─ subscribeEvents()
```

### 2.2 Electron Desktop

功能清单：

- 无边框窗口
- 多窗口与单实例锁
- 窗口最大化、最小化、置顶、关闭
- 原生菜单与系统托盘
- Dock Badge
- 开机自启
- 防系统休眠
- 外部应用唤起
- 文件选择、打开、Reveal
- 深度链接
- Mini Chat 窗口
- Chromium CDP / Browser Pane
- Electron 自动更新
- 内嵌 Web Server
- SSH 远端管理
- Relay Tunnel

| 功能 | 决策 |
|---|---|
| 窗口、菜单、托盘、单实例 | 直接保留 |
| Mini Chat | 直接保留 |
| 深度链接 | 直接保留 |
| 原生文件操作 | 直接保留 |
| CDP / Browser Pane | 直接保留 |
| Electron 自动更新 | 直接保留 |
| 内嵌 OpenChamber Server | 重写为 Canonical Server |
| OpenCode CLI 启动 | 抛弃 |
| OpenCode 孤儿进程清理 | 抛弃 |
| OpenCode CWD 管理 | 抛弃 |

推荐：Electron 主进程启动 Canonical Server，Agent Service 单独运行；不要把 OMP Agent Runtime 混进 Renderer。

### 2.3 VS Code 插件

功能：

- Activity Bar / Sidebar Chat
- Session Editor Tab
- Agent 管理面板
- 选区加入上下文
- Explorer 文件附加
- Explain / Improve Code
- 新建 Session
- Workspace folder 同步
- 行内代码评论
- Webview 与 Extension Host Bridge
- FS Bridge、Git Bridge、Settings Bridge
- 本地 Agent 运行时连接

| 功能 | 决策 |
|---|---|
| VS Code UI | 直接保留 |
| Chat View / Session Editor | 直接保留 |
| 行内评论 | 直接保留 |
| 选区和 Explorer 上下文 | 直接保留 |
| FS / Git Bridge | 保留并统一到 Canonical Host API |
| Webview Bridge | 重写 |
| OpenCode CLI 下载与启动 | 抛弃 |
| OpenCode 端口代理 | 抛弃 |
| OpenCode SSE Proxy | 抛弃 |
| OpenCode 配置解析 | 抛弃 |

VS Code 不应继续维护一套独立的 OpenCode API。应消费统一的 Canonical Client；Transport 可以是 Extension Host 内部 Bridge，也可以是本地/远程 Canonical API。

### 2.4 Mobile / Capacitor

功能：

- 移动端布局、底部 Drawer、Edge Swipe
- 移动 Composer
- 扫码配对
- Secure Storage
- Deep Link
- APNs / FCM
- iOS Widget / Notification Service Extension
- Presence-aware 通知抑制
- 远程 Server 连接与 Token 管理

决策：原生壳和用户体验全部保留；Session API、消息流、推送事件映射改为 Canonical API。

必须保留：SSE 心跳、断线恢复、消息队列、状态重同步、Approval 恢复、推送点击定位 Session。

## 3. 主布局与导航

### 3.1 MainLayout / Header / Context Panel

| 功能 | 决策 |
|---|---|
| MainLayout 三栏布局 | 直接保留 |
| ContextPanel / Rail | 直接保留 |
| Surface 标签、拖拽、宽度调整 | 直接保留 |
| Header 布局 | 直接保留 |
| Session 标题 | API 适配 |
| Git 分支和 Worktree 状态 | 保留，调用 Host Git API |
| Model / Agent 选择器 | 重写 |
| Context Usage | 重写数据源 |
| OpenCode 多实例切换 | 抛弃，改为 Agent Service 节点或 Project 切换 |
| AI 重命名 | 保留，模型调用切换至 OMP |

### 3.2 Session Sidebar

功能：

- 多项目、多目录
- Worktree 分组
- Session 树
- 父子 Session / Subagent
- 搜索、归档、固定
- Session Folder
- 批量移动、删除、归档
- Session 导出
- Scheduled Tasks 入口

| 功能 | 决策 |
|---|---|
| Session Tree UI | 直接保留 |
| Session Folder | 直接保留 |
| 搜索、归档、批量操作 | 直接保留 |
| Worktree 拓扑 | 直接保留 |
| 父子 Session | 保留，需 OMP Session Manager 支持 |
| 多项目 / 多目录 | 保留，由 OpenChamber Agent Service 管理 |
| OpenCode Directory Header | 抛弃 |
| OpenCode 多进程隔离模型 | 抛弃 |
| Scheduled Tasks | 保留，执行层改写 |

OMP 不会自动提供 OpenChamber 需要的“多项目、多 cwd、多 Session 常驻管理”。需要显式维护：

```text
Project
 ├─ cwd
 ├─ worktrees
 ├─ agentService
 └─ sessions
     ├─ AgentSession A
     ├─ AgentSession B
     └─ Child Sessions
```

## 4. Chat、消息与流式执行

### 4.1 ChatView

功能：

- 历史消息加载、分页、预取
- 流式输出
- 自动滚动
- 回合耗时
- Running / Idle / Error 状态
- Abort、Retry
- Session 恢复
- Tool、Permission、Question 展示
- Subagent 跳转

决策：UI 保留，整个同步与数据层重写。

当前 OpenCode 专有依赖包括：

- `@opencode-ai/sdk/v2`
- OpenCode SSE
- `message.part.delta`
- `session.status`
- `permission.asked`
- `question.asked`
- `session.idle`
- `session.busy`

不要长期把 OMP 事件伪装成 OpenCode 事件。应建立 Canonical Event Schema：

```ts
 type CanonicalEvent =
   | { type: "session.created"; session: Session }
   | { type: "session.status"; status: "idle" | "running" | "waiting" | "error" }
   | { type: "message.created"; message: Message }
   | { type: "part.started"; part: Part }
   | { type: "part.delta"; partId: string; delta: string }
   | { type: "tool.started"; call: ToolCall }
   | { type: "tool.updated"; call: ToolCall }
   | { type: "tool.completed"; call: ToolCall }
   | { type: "approval.requested"; request: ApprovalRequest }
   | { type: "question.requested"; request: QuestionRequest }
   | { type: "turn.completed"; turn: Turn }
   | { type: "session.error"; error: CanonicalError };
```

### 4.2 Message Parts

现有渲染类型：

- Assistant Text
- Reasoning
- Tool
- User Context
- File / Attachment
- JSON / Structured Output
- Diff
- Subagent
- Error / Status

| 部分 | 决策 |
|---|---|
| React 渲染组件 | 直接保留 |
| Part 视觉设计 | 直接保留 |
| Part 状态管理 | 适配 Canonical Part |
| OpenCode Part 类型 | 抛弃 |
| OpenCode Part 字段兼容层 | 抛弃 |

### 4.3 ToolPart

保留的用户体验：

- Tool 名称、输入、输出
- 运行中、成功、失败、拒绝状态
- Diff 展示与 Patch 应用
- Bash 输出
- 文件写入
- 嵌套 Task
- Subagent Session 跳转

重写 Tool Schema：

```ts
 type CanonicalToolCall = {
   id: string;
   name: string;
   input: unknown;
   output?: unknown;
   status: "pending" | "running" | "success" | "error" | "rejected";
   sessionId: string;
   childSessionId?: string;
   startedAt?: number;
   finishedAt?: number;
 };
```

删除 OpenCode tool name 白名单、专属 Tool 参数转换和 OpenCode LSP renderer。

## 5. Composer 输入系统

### 5.1 ComposerEditor

| 功能 | 决策 |
|---|---|
| CodeMirror 6 编辑器 | 直接保留 |
| 多行、自动高度、历史输入 | 直接保留 |
| 粘贴和拖拽附件 | 直接保留 |
| 大文本处理 | 直接保留 |
| `@file` | 保留，调用 Canonical FS API |
| `@agent` / `@skill` | 重写数据源 |
| Slash Commands | 重写运行时 |
| Model / Agent 选择 | 重写 |
| cwd / Worktree 选择 | 重写 |
| OpenCode Message Part 构造 | 抛弃 |

### 5.2 Slash Commands、Skills、Snippets

功能来源：

- OMP Native Slash Commands
- OMP Skills
- OpenChamber Prompt Templates
- OpenChamber 自定义 Commands

保留用户体验，删除：

- `.opencode/commands`
- OpenCode command routes
- OpenCode snippet 路径
- OpenCode command restart 机制

Skills Catalog、下载、安装和管理属于 OpenChamber 资产，可以继续保留，落盘路径改成 OMP / OpenChamber Canonical 目录。

## 6. 权限、审批和 Question

### 6.1 Permission

当前功能：

- Bash / 写文件权限
- Tool 级 allow / ask / deny
- Session 级和全局自动放行
- Permission Queue
- 多窗口同步
- Toast / Dialog

决策：UI 和安全策略保留；OpenCode Permission 协议彻底重写。

OMP 可承接 Tool Approval、Human-in-the-loop、工具级审批、Bash pattern 和审批模式，但 UI 使用 Canonical Approval API：

```text
GET  /api/approvals/pending
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
POST /api/approvals/:id/always-allow
POST /api/approvals/:id/always-deny
```

### 6.2 Question

保留：

- 选项问题
- 自定义文本回答
- Reject
- 阻塞 Session
- 移动端回答
- 跨客户端同步

Permission 和 Question 必须是两个概念：

- Permission：是否允许工具执行
- Question：Agent 需要用户提供业务输入

### 6.3 Gatekeeper

| 部分 | 决策 |
|---|---|
| OMP 已覆盖的 Bash approval / pattern | 映射到 OMP |
| OpenChamber 宿主安全边界 | 必须保留 |
| OpenCode 专用 Gatekeeper Glue | 抛弃 |

必须保留：Workspace root 校验、Git root 拒绝、命令注入防护、复合命令策略、环境变量剥离、PTY 进程清理。

## 7. Files、编辑器与预览

### 7.1 文件系统

功能：

- 文件树、目录列表
- 读取、写入、删除、重命名
- 上传、下载
- 图片、音频、视频预览
- HTTP Range
- 静态 HTML 预览
- 后台执行任务

决策：**全部保留为 Canonical Host FS API**。

OMP 的 `read`、`write`、`edit`、`glob`、`grep` 是 Agent-facing 工具，不能替代 OpenChamber 面向用户的文件浏览、上传、媒体服务和编辑器 API。

必须保留：

- Canonical root 校验
- symlink 逃逸防护
- 写入、删除、上传、重命名的最终物理路径校验
- 大文件限制
- 原子上传替换
- URL token 和 Referer 校验
- 206 Range 支持

### 7.2 CodeMirror 与文件编辑

决策：**直接保留**。

包括：

- CodeMirror 6
- Vim 模式
- Shiki 高亮
- 图片、表格、Markdown、Diagram、Draw.io 预览
- 行内评论组件

### 7.3 Diff

功能：

- 分支比较
- Working Tree diff
- Staged / Unstaged diff
- Hunk 级 Stage / Unstage / Discard
- 大 Diff Worker 渲染
- OOM 降级保护

决策：**直接保留**，作为 Canonical Git API 和前端 Diff UI。

## 8. Git、Worktree 与代码协作

### 8.1 Git

功能：

- Status
- Branch
- Checkout
- Stage / Unstage
- Commit
- Push
- Pull
- Conflict 处理
- Stash
- Hunk 操作
- Branch range diff
- Worktree
- PR 分支关联

决策：**直接保留为 Canonical Host Git Service**。

需要删除的只是 VS Code / OpenCode runtime 分支，不是 Git 功能本身。

必须保留：

- `GIT_TERMINAL_PROMPT=0`
- Git root 拒绝策略
- SSH key path 转义
- index lock 保护
- 路径规范化
- Windows MSYS / longpaths 兼容

### 8.2 AI Commit Message

功能保留，但模型调用从 OpenCode `requestSmallModel` 改为 OMP Model / Completion API。

### 8.3 Worktree

Worktree 创建、删除、拓扑观察、Bootstrap、信任哈希、项目配置全部保留。

Session 创建时改为：

```text
createWorktree()
  └─ createCanonicalProject()
       └─ createOMPSession({ cwd: worktreePath })
```

## 9. Terminal、Browser 和 Dev Preview

### 9.1 Terminal

功能：

- Xterm.js
- 多 Tab
- 交互式 PTY
- Shell 探测
- 二进制 WebSocket 协议
- 滚动缓冲
- 重连回放
- Project Actions
- 跨平台 Shell
- POSIX 进程树清理

决策：**直接保留为 Canonical Host Terminal Service**。

OMP Bash 工具和用户终端定位不同：

- OMP Bash：Agent 单次工具执行
- OpenChamber Terminal：用户可见的长期交互式 PTY

必须保留环境变量剥离、20 秒优雅退出、进程树清理和 PID 复用防护。

### 9.2 Browser Control

功能：

- `browser.open`
- `snapshot`
- `click`
- `type`
- `scroll`
- `back`
- `forward`
- `inspect`
- `capture`
- `resize`
- Browser Broker
- 多窗口原子 Claim

决策：**Agent 接口重写，Broker 与前端执行机制保留**。

目标：将 Browser Control 注册为 OMP Host Tool / Custom Tool；保留 OpenChamber Browser Broker、超时、settle 和原子 claim。

禁止删除：多窗口独占 Claim。否则多个客户端可能重复执行点击、输入等副作用操作。

### 9.3 Dev Server 与 Dev Tunnel

功能：

- 本地监听端口扫描
- Linux `/proc/net/tcp`、`lsof`、`netstat` fallback
- 开发服务器预览
- Raw TCP over WebSocket
- Cloudflare / ngrok
- E2EE Relay
- Pairing

决策：**全部保留为 Host / Network Service**。

Dev Tunnel 必须继续限制到已扫描确认的端口，不能允许任意内部地址拨号。

## 10. Walkthrough、Goals、Assist、Queue、Routing

### 10.1 Walkthrough

功能：

- Git Diff Hunk 分解
- 稳定 Hunk ID
- generated 文件过滤
- AST 差异摘要
- 结构化 JSON 输出
- 章节导读
- 内容寻址缓存
- Hunk 与 UI 锚定

决策：算法、缓存、UI 全部保留；Small Model 调用改为 OMP。

### 10.2 Session Goals

功能：

- 用户设定目标
- 目标文件持久化
- Session idle 监听
- Small Model 审计
- `continue / complete / blocked` 判断
- 自动续写
- Token 单调计数器
- Compaction 分段
- 连续 blocked 保护
- 完成通知

决策：**保留为 OpenChamber Autonomous Goal Supervisor**。

改动仅包括：

- OpenCode idle 事件改为 OMP Session Lifecycle Event
- `prompt_async` 改为 OMP continuation API
- 消息历史读取改为 Canonical Session History

### 10.3 Session Assist

功能：

- Session idle 后冷却
- 提取最近三轮对话
- 去除冗余 Tool 输出
- 生成 recap
- 生成 suggestion
- 写入 Session metadata

决策：**保留，Small Model 改接 OMP**。

### 10.4 Message Queue

功能：

- Session 忙碌时缓冲消息
- 移动端断线缓冲
- 持久化队列
- 原子写入
- 顺序投递
- Retry / backoff
- Hold 租约
- Slash / Attachment / Mention 完整 payload

决策：**必须保留，升级为 Canonical Gateway 核心能力**。

### 10.5 Routing

功能：

- `openchamber/auto`
- 意图分类
- Model / Agent / Thinking 参数改写
- Token 控制
- Safety Net
- Feature Flag

决策：**保留为 Canonical Gateway Policy Pipeline**。

OMP 负责执行；OpenChamber 负责产品级意图路由和策略。

## 11. Memory、Context、Todo、Folders

### 11.1 Project Context

包括：

- Notes
- Plans
- Project Todos
- Agent Memory
- `.openchamber/plans/*.md`
- 原子写锁
- 项目级存储

决策：**完全保留**，属于 OpenChamber 差异化资产。

### 11.2 Session Knowledge

包括：

- 知识送达凭证
- Pinned Context
- Compaction 后重新注入
- 跨客户端送达状态

决策：**完全保留**，在 OMP Prompt / Message Parts 层注入。

### 11.3 Agent Memory

包括：

- Global / Project scope
- CRUD
- Prompt 注入
- Threat Pattern 扫描
- 持久化

决策：**完全保留**。

### 11.4 Agent Todo

OpenCode 的 `session.todo` 事件不能直接保留。

决策：

- Todo UI：保留
- Project Todo：保留
- Agent Runtime Todo：改为 Canonical Todo / OMP Task 状态
- OpenCode `todo.updated`：抛弃

### 11.5 Session Folders / Retention

功能：

- 文件夹树
- 拖拽归类
- 固定
- 归档
- 批量操作
- 保留最新 Session
- 活跃 Session 保护
- 子 Session 级联删除

决策：**全部保留**，底层 delete / archive API 换成 Canonical Session API。

## 12. Scheduled Tasks、Multi-run、Fusion

### 12.1 Scheduled Tasks

功能：

- Once
- Daily
- Weekly
- 任意 CRON
- IANA Timezone
- `.agents/loops/*.md`
- `~/.agents/loops/*.md`
- 多实例 occurrence claim
- 防重复执行
- 超时与失败保护
- 立即执行

决策：**调度器直接保留，执行器改为 OMP Agent Service**。

### 12.2 Multi-run

功能：

- 多模型并发
- 多 Agent 并发
- 多 Session 创建
- Project / Worktree 绑定
- 结果聚合

决策：**保留，Session 创建与 Prompt Dispatch 改为 Canonical API**。

### 12.3 Fusion

功能：

- 收集多个分支结果
- 文本聚合
- 生成统一上下文
- Fusion Session

决策：**直接保留**。这是 OpenChamber 上层编排逻辑，不依赖 OpenCode。

## 13. Settings、Provider、Agent、MCP、Skills

### 13.1 Settings Registry

当前分层：

- Instance
- Profile
- Device
- Per-surface

决策：**保留该架构，移除 OpenCode 专属键**。

删除或迁移：

- `opencodeBinary`
- OpenCode update toast version
- OpenCode restart confirmation
- OpenCode instance URL
- OpenCode auth path
- OpenCode-specific env settings

### 13.2 Provider / Model

决策：**UI 保留，后端完全重写**。

目标数据源：

- OMP ModelRegistry
- OMP AuthStorage
- OMP models configuration
- OpenChamber 自定义 Provider metadata cache

保留：

- 自定义 Base URL
- API Key
- OAuth UI
- Model capability display
- Context window
- Pricing
- Vision / reasoning 等标签

删除：

- OpenCode provider endpoint
- OpenCode `opencode.json` 写入
- OpenCode `auth.json`

### 13.3 Agent

决策：**UI 保留，模型和权限绑定重写**。

目标映射：

- Agent Registry
- OMP model roles
- OMP task / subagent
- Canonical tool approval policy

### 13.4 MCP

功能：

- Server CRUD
- stdio / SSE / HTTP
- OAuth
- Enable / Disable
- Tool Refresh

决策：**页面保留，配置和运行时重写为 OMP Native MCP**。

删除 OpenCode `opencode.json` MCP 结构和 deferred restart 语义。若 OMP 支持动态刷新，迁移后不应继续显示“Apply & Restart”。

### 13.5 Skills

决策：**直接保留并增强**。

可以兼容标准 `SKILL.md`，将 Catalog 下载目标统一到 OMP / OpenChamber skills 目录。

## 14. GitHub、Linear、Quota、通知、语音

### 14.1 GitHub

功能：

- OAuth Device Flow
- Token 存储
- PR 状态
- 多 Remote / Fork 解析
- PR 视图
- PR 操作

决策：**全部直接保留为 Canonical GitHub Integration**。

### 14.2 Linear

功能：

- OAuth PKCE
- GraphQL
- Team / Project 映射
- Issue 列表
- Issue 状态
- Session 进度回帖

决策：

- OAuth、GraphQL、映射、UI：直接保留
- `status-runtime`：重写事件源，从 OpenCode Session Event 改为 OMP Canonical Event
- 公网 Session URL 过滤：必须保留

### 14.3 Quota / Usage

功能：

- Provider quota
- 多家厂商账单 API
- Token usage
- Credential import
- 429 冷却与并发合并

决策：**前端保留，凭证源重写**。

禁止读取：

- OpenCode `auth.json`
- OpenCode 专属 credential path

应读取：

- OMP AuthStorage
- OpenChamber Credential Store
- Provider 原生凭证链

### 14.4 Notifications

功能：

- Toast
- Web Push / VAPID
- APNs
- Desktop Notification
- SSE / WebSocket 广播
- Session Attention
- 前台可见性抑制
- 子任务静默

决策：**全部保留，触发器改接 OMP Canonical Event**。

触发事件：

- Turn completed
- Session error
- Tool approval requested
- Question requested
- Goal completed
- Scheduled Task completed

### 14.5 TTS / STT

功能：

- TTS
- OpenAI-compatible voice
- macOS `say`
- STT
- Dictation WebSocket
- Markdown / Code block 清洗

决策：**全部保留为 OpenChamber Voice Service**。

OMP 的 `speech` / `dictation` model role 可以作为模型选择来源，但不能替代现有音频服务协议。

## 15. Auth、Pairing、Tunnel、Relay

### 15.1 UI Auth / Passkey

功能：

- Password
- WebAuthn / Passkey
- Session Cookie
- Port-specific Cookie Name
- Rate Limit
- LAN Exposure Guard

决策：**完全保留**，作为 Canonical Gateway Auth。

### 15.2 Remote Client / Pairing

功能：

- Bearer Token
- Token revoke
- Pairing v2
- 一次性短效凭证
- QR / Deep Link
- Remote Client 管理

决策：**完全保留**。

### 15.3 Tunnel / Relay

功能：

- Cloudflare Quick Tunnel
- Cloudflare Managed Tunnel
- ngrok
- E2EE Relay
- ECDH + AEAD
- Host Lock
- NAT 穿透
- Dev Tunnel

决策：**完全保留**，它们属于 OpenChamber 网络层，与 Agent 引擎无关。

## 16. Guest SDK / Extensions

功能：

- iframe Guest
- `postMessage` Host-Guest 协议
- panel / dialog / page / background / service
- files / filesystem / network / service / storage / model 权限
- Extension install / update
- ZIP、Git、本地目录安装
- Service 子进程
- Health Check
- Reverse Proxy
- Guest Storage
- Shared Surface WebSocket
- Browser Provider
- Guest UI 控件库

决策：

| 功能 | 决策 |
|---|---|
| SDK Contract | 直接保留 |
| Manifest | 直接保留 |
| UI 控件 | 直接保留 |
| 安装、更新、目录管理 | 直接保留 |
| 权限白名单与沙箱 | 必须保留 |
| Guest storage | 直接保留 |
| Service 守护进程 | 直接保留 |
| `generate` 小模型调用 | 改接 OMP |
| `contributes.tools` | 映射到 OMP Custom Tool / MCP |
| VS Code Guest 支持 | 待决 |

禁止因切换 OMP 而放宽 Guest 的 filesystem、service、network 权限隔离。

## 17. 明确抛弃清单

### 17.1 全部 OpenCode Proxy / Lifecycle

删除或彻底移除依赖：

- `packages/web/server/lib/opencode/lifecycle.js`
- OpenCode proxy
- OpenCode watcher
- OpenCode resolution runtime
- OpenCode proxy headers
- OpenCode env runtime / env config
- OpenCode HMR state runtime
- OpenCode 多目录进程唤醒和端口探活
- OpenCode readiness gate

### 17.2 OpenCode 配置和凭证

抛弃：

- `opencode.json` 作为主配置格式
- OpenCode `auth.json`
- OpenCode Provider API
- OpenCode Agent profile schema
- OpenCode MCP config schema
- OpenCode CLI 路径设置
- OpenCode Restart / Apply 语义

### 17.3 OpenCode UI 专属功能

抛弃：

- OpenCode CLI 设置页
- OpenCode 更新 Toast
- OpenCode Runtime Upgrade
- Remote OpenCode Instance Connector
- OpenCode Session Share
- OpenCode 专属 LSP renderer
- `LSP errors detected` 文本清理
- `<file_diagnostics>` 清理
- OpenCode tool injection adapter
- OpenCode-specific startup recovery

### 17.4 Session Share

OpenCode 的 `session.share` 依赖 OpenCode 云端服务。

决策：

- 没有自建分享服务：抛弃
- 需要分享：重写为 OpenChamber 自有分享服务
- 不保留 OpenCode share API 兼容层

## 18. 必须保留的安全边界

### FS

- realpath 后的 Canonical Root 比对
- symlink 最终目标校验
- 写、删、上传、重命名越界拦截
- 大文件限制
- 原子上传替换
- 静态资源 Token 和 Referer 校验

### Git

- 拒绝 `/`、`$HOME` 等危险根目录
- `GIT_TERMINAL_PROMPT=0`
- SSH key path 转义
- index lock 保护
- 路径规范化

### PTY

- 清理 `ARGV0`、`NODE_CHANNEL_FD`、`ELECTRON_RUN_AS_NODE`
- POSIX 20 秒优雅退出
- SIGKILL fallback
- 子进程树清理
- PID 复用防护

### Browser

- 多客户端原子 Claim
- 请求超时
- settle 机制
- 不允许重复执行副作用操作

### Linear

- 禁止把 localhost、127.0.0.1、私有网段和单标签 hostname 发布到公共 Issue

### Guest

- filesystem scope
- network scope
- service 子进程环境白名单
- 健康检查
- 反向代理边界
- storage 隔离
- manifest 权限校验

## 19. 推荐迁移阶段

### Phase 0：冻结边界

目标：建立 Canonical API，不再新增 OpenCode 依赖。

- 定义 Canonical Session / Message / Part / Tool / Approval / Question
- 定义 Canonical Event
- 定义 Canonical Client
- 确定 OMP Agent Service 进程边界
- 标记所有 OpenCode imports 和 routes

### Phase 1：Host 能力先迁移

优先迁移不依赖 Agent 协议的功能：

- FS
- Git
- Worktree
- Diff
- Terminal
- Browser Broker
- Project Config
- Auth / Passkey
- Pairing
- Tunnel / Relay
- Notifications
- TTS / STT

### Phase 2：OMP Agent Service

实现：

- 多 Project / 多 cwd
- Session Manager
- Session persistence
- Message history
- Streaming events
- Tool calls
- Subagent sessions
- Approval / Question
- Abort / Retry
- Context usage

### Phase 3：UI 数据层替换

替换：

- `SyncProvider`
- `sync-context`
- `session-actions`
- `session-message-loader`
- `permissionStore`
- Provider / Agent / MCP stores
- Chat stream adapter

保留：

- MainLayout
- Chat rendering
- Composer UI
- Tool UI
- Files / Git / Diff surfaces
- Mobile shell
- Electron shell
- VS Code UI

### Phase 4：高级 OpenChamber 能力接入

- Goals
- Session Assist
- Message Queue
- Routing
- Project Context
- Agent Memory
- Session Knowledge
- Scheduled Tasks
- Multi-run / Fusion
- Walkthrough
- AI Commit / PR generation

### Phase 5：清理 OpenCode

确认所有调用迁移后，删除：

- `packages/web/server/lib/opencode/`
- OpenCode SDK 依赖
- OpenCode 配置页
- OpenCode auth adapter
- OpenCode CLI lifecycle
- VS Code OpenCode process manager
- OpenCode-only LSP / tool renderer
- Session Share compatibility

## 20. 最终架构决策

### 保留的 OpenChamber 核心

- 所有主界面和多宿主 UI
- Files / Editor / Preview
- Git / Worktree / Diff
- Terminal / Browser Control
- Project Context / Memory / Knowledge
- Goals / Assist / Queue / Routing
- Scheduled Tasks / Multi-run / Fusion
- Walkthrough
- GitHub / Linear
- Auth / Passkey / Pairing
- Tunnel / Relay / Dev Tunnel
- Notifications / TTS / STT
- Guest SDK / Extensions
- Electron / Mobile / VS Code 壳

### OMP 承担的部分

- Model Registry
- Provider Auth
- Agent Session 执行
- Tool Runtime
- MCP
- Skills
- Streaming
- Subagent Dispatch
- Tool Approval 基础能力
- Model Roles

### OpenChamber Canonical API 承担的部分

- 跨端 Session API
- 统一事件模型
- 多项目、多 cwd、多 Session 管理
- Host FS / Git / PTY / Browser
- Approval / Question
- Message Queue
- Goals / Assist / Routing
- Memory / Context
- Push / Notification
- Guest / Extension
- Auth / Pairing / Tunnel

### 彻底抛弃的部分

- OpenCode Proxy
- OpenCode CLI 生命周期
- OpenCode 配置和凭证格式
- OpenCode Remote Instance
- OpenCode Update / Restart UI
- OpenCode Session Share
- OpenCode 专属 Tool / LSP 适配
- OpenCode 专属 VS Code 进程管理

最终原则：**OpenChamber 保留产品和宿主能力；OMP 负责 Agent 执行；Canonical API 隔离两者；OpenCode 不再作为兼容目标。**
