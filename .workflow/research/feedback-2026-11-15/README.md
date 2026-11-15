# Research: maintainer feedback 2026-11-15

The maintainer installed the packaged Electron build of `main` (`1fc6270437`) and reported seven items, most of them about the Settings pages. Each item's cause is located in source, with evidence from the maintainer's data under `~/.local/share/ohpichamber-iso/` and `~/.omp/agent/`. OMP facts come from the pinned 18.18.0 tarballs, not from the older `/home/shizuku/Project/oh-my-pi` checkout (18.8.9).

## Maintainer feedback, verbatim

1. vibe模式的工具 应该还是会因为host权限被拒绝 所以要仔细查一下这个host的策略机制 已经因为这个反馈了好多次了 omp不是加了权限系统了吗 用他的不行吗
2. todo框在没有进行任务的时候 就是显示一个空白
3. 集成商店安装集成时 如果需要oauth等情况 这个登录或者说oauth机制有问题 会直接报错 而不是正确提示 或者是弹出授权页等等
4. 思维链内容似乎不会换行 这些思维链内容应该都是有换行的 一行一个
5. 路由页这个添加新类别的这块 需要重写 uiux做的很差
6. 供应商方面：
   - 可以将来自环境变量的供应商搞成内置供应商吗 只要在这个供应商里输入api key
   - 这个供应商id的限制 omp应该没有吧 我记得 这个是opencode的限制来着 把这个去掉 并且注意排查一下 openchamber里因为opencode的限制而所做的限制或改变 现在这些东西做了改变了没有
   - 在供应商添加或者编辑的获取模型这里 给出添加全部模型和清理失效模型的按钮 另外 模型多模态能力 上下文大小 可以做一个接口 自动去openrouter去配置相关的东西的填写 也就是说 再做一个按钮"尝试自动填写模型信息"
   - 网页搜索这里 备用提供商这里做的还是不好看 重新想一个符合项目整体设计的东西 然后下面那个超时设置 第一个问题 输入框也太宽了 第二个问题 位置也不对 应该放在这一页的上面位置 而不是单独放在最下面
7. 感觉设置页一些内容排布有问题 不知道为什么 没有充分的利用空间 右侧是空着的

Added during planning:

- 因为omp的设置项说实话 很复杂 如果能将一些复杂的项用某种方式去简化 或者给一些配置的说明 或许应该会更好 另外 实在复杂的 就可以放在omp设置的一个tab栏里 叫作高级设置 当然 那些是真正是高级设置的设置 不然 普通设置的话 还是放在那个位置 但是设置项的顺序与编排你要好好规划
- 设置页控件之间的间距 还有控件的大小等等这些 这些东西也要全部统一一下

## Reports

| Item | Report |
|---|---|
| 1 Vibe-mode tool denials; OMP's permission system | [VibeDenials.md](VibeDenials.md) |
| 2 Empty todo box; 4 reasoning line breaks | [ChatRender.md](ChatRender.md) |
| 3 Integration store OAuth | [IntegrationOAuth.md](IntegrationOAuth.md) |
| 6 Env-var providers, provider-ID limit and OpenCode-era limits, fetch models and auto-fill | [Providers.md](Providers.md) |
| 5 Routing; 6 web search; 7 wasted space; control spacing and size | [SettingsLayout.md](SettingsLayout.md) |
| OMP settings simplification and the Advanced tab | [OmpSettingsIA.md](OmpSettingsIA.md) |

## Settled

Recorded in `decisions.md` on 2026-11-15 (effort `ux-feedback-2026-11-15`). The maintainer chose every recommended option:

- The Host classifies OMP tools by the tier the tool itself declares; hard denials remain only for real boundaries.
- The todo tray shows only while a task is open.
- MCP OAuth starts on install, polls to completion, and uses a runtime-split redirect; enterprise mode refuses it.
- Model auto-fill reads OMP's bundled catalog first and OpenRouter second; enterprise mode skips OpenRouter.
- Settings rows use the label-left, control-right pattern with one set of control sizes and spacings; the 840 px page cap stays.
- The OMP page gets four tabs (Common, Editing & reading, Execution & tools, Advanced); other pages keep their rows.
- Routing categories become a flat disclosure list with a checkbox per category.

## Ruled out

- Letting OMP's `tools.approvalMode` decide prompts while the Host keeps only invariants: our approval card would stop covering `eval` and MCP under `ask`, and OMP cannot express the workspace boundary.
- Adding `vibe_*` to the Host's name list: the next OMP or plugin tool would fall through again.
- OpenRouter as the only model-info source: a second authority that can disagree with what OMP executes, and an egress call enterprise mode must refuse.
- Raising the settings page width cap now: the empty space comes from the rows, not the page.
- Moving other pages' complex rows into the OMP Advanced tab: the complaint is about the OMP page, and every move also moves a search entry and an owner.
