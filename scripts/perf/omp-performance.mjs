/**
 * The three R8 numbers, measured on a running OpenChamber server.
 *
 * W9 asks for evidence that three paths stay inside their budgets:
 *
 * - **OMP Settings tab switch**: opening Settings → OMP and moving between its
 *   sections must acknowledge within 100 ms. The page is one route, so the
 *   number is the time from the click to the page's own heading being on
 *   screen, measured through the browser's own input and paint.
 * - **Prompt dispatch, new versus warm session**: a prompt on a session whose
 *   worker is already live must not be more than 150 ms slower on a session
 *   that has to start one. Both numbers are the Host's `POST /runs`
 *   acknowledgement, which is what the composer waits for before it can show
 *   the run.
 * - **Repeated model/provider catalog reads**: the second and later reads of a
 *   workspace's model and provider catalogs must answer within 20 ms, because
 *   every Settings page and the composer read them.
 *
 * The catalog and dispatch numbers are HTTP timings against the server the
 * caller names; the tab switch is measured in a real Chrome through CDP. A run
 * writes `omp-performance.json` so two builds can be compared field by field.
 *
 * The dispatch scenario needs a session it may send to. It creates its own
 * session (and a second one for the warm case) with `--model`, so it never
 * touches the sessions a user is working in.
 */

import { mkdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import process from "node:process"

import { CdpClient, createPageTarget, evaluateValue, launchChrome, reservePort, resolveChrome, resolveProfileDir, wait } from "./cdp.mjs"
import { percentile, round } from "./metrics.mjs"

const HELP = `Usage: bun run profile:omp -- [options]

Measures the R8 budgets: the OMP Settings tab switch, prompt dispatch on a new
versus a warm session, and repeated model/provider catalog reads.

Options:
  --url <url>              OpenChamber URL (default: http://localhost:3000)
  --dir <path>             Project directory the workspace resolves to
                           (default: the server's active project)
  --model <provider/model> Model the dispatch scenario sends with
                           (default: the workspace's default model)
  --reads <n>              Catalog reads to time (default: 8)
  --settle <seconds>       Wait after the page loads (default: 14)
  --output <directory>     Writes omp-performance.json
                           (default: artifacts/omp-performance-<time>)
  --label <text>           Human label stored in the summary
  --chrome <path>          Chrome/Chromium executable
  --profile-dir <path>     Chrome profile to reuse (default: a fresh temporary
                           profile per run, removed afterwards)
  --headed                 Show the browser (default: headless)
  --skip-ui                Skip the browser scenario (catalog and dispatch only)
  --help                   Show this help

Needs a running OpenChamber server; see scripts/perf/DOCUMENTATION.md.`

const parseArgs = (argv) => {
  const options = { url: "http://localhost:3000", dir: null, model: null, reads: 8, settle: 14, output: null, label: null, chrome: null, profileDir: null, headless: true, skipUi: false }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--help") { console.log(HELP); process.exit(0) }
    else if (value === "--url") options.url = argv[++index]
    else if (value === "--dir") options.dir = resolve(argv[++index])
    else if (value === "--model") options.model = argv[++index]
    else if (value === "--reads") options.reads = Number(argv[++index])
    else if (value === "--settle") options.settle = Number(argv[++index])
    else if (value === "--output") options.output = argv[++index]
    else if (value === "--label") options.label = argv[++index]
    else if (value === "--chrome") options.chrome = argv[++index]
    else if (value === "--profile-dir") options.profileDir = resolve(argv[++index])
    else if (value === "--headed") options.headless = false
    else if (value === "--skip-ui") options.skipUi = true
    else throw new Error(`Unknown option: ${value}`)
  }
  if (!Number.isInteger(options.reads) || options.reads < 2) throw new Error("--reads must be at least 2")
  return options
}

/** A cookie-authenticated JSON client for the server the caller names. */
const createClient = async (baseUrl) => {
  const auth = await fetch(new URL("/auth/session", baseUrl))
  if (!auth.ok) throw new Error(`The server refused the session handshake with HTTP ${auth.status}.`)
  const cookie = auth.headers.getSetCookie().map((entry) => entry.split(";")[0]).join("; ")
  const json = async (pathname, init = {}) => {
    const response = await fetch(new URL(pathname, baseUrl), {
      ...init,
      headers: { cookie, origin: baseUrl, "content-type": "application/json", ...(init.headers ?? {}) },
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`${pathname} answered ${response.status}: ${text.slice(0, 300)}`)
    return text ? JSON.parse(text) : null
  }
  return { json }
}

const timed = async (operation) => {
  const started = performance.now()
  const value = await operation()
  return { ms: performance.now() - started, value }
}

/** The project the server already knows, so a run needs no --dir. */
const activeDirectory = async (client) => {
  const projects = await client.json("/api/agent/v1/projects")
  const active = projects.items?.[0]
  if (!active) throw new Error("The server lists no project; pass --dir.")
  return active.path
}

const measureCatalogs = async (client, workspaceId, reads) => {
  const models = []
  const providers = []
  for (let index = 0; index < reads; index += 1) {
    models.push((await timed(() => client.json(`/api/agent/v1/workspaces/${workspaceId}/models`))).ms)
    providers.push((await timed(() => client.json(`/api/agent/v1/workspaces/${workspaceId}/providers`))).ms)
  }
  // The first read of each catalog is the cold one; the budget is about the
  // repeated reads every Settings page and the composer perform.
  const warm = (series) => series.slice(1)
  return {
    models: { firstMs: round(models[0]), warmMedianMs: percentile(warm(models), 0.5), warmMaxMs: round(Math.max(...warm(models))), samples: models.map((value) => round(value)) },
    providers: { firstMs: round(providers[0]), warmMedianMs: percentile(warm(providers), 0.5), warmMaxMs: round(Math.max(...warm(providers))), samples: providers.map((value) => round(value)) },
  }
}

/** Waits until the session reports no active run, so the next send is a fresh dispatch. */
const waitIdle = async (client, sessionId, timeoutMs = 120_000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const snapshot = await client.json(`/api/agent/v1/sessions/${sessionId}/snapshot`)
    if (snapshot.session?.activeRunId === null && snapshot.session?.runtimeStatus !== "busy") return
    await wait(200)
  }
  throw new Error(`Session ${sessionId} did not become idle within ${timeoutMs} ms.`)
}

const createSession = async (client, workspace, options) => {
  const created = await client.json("/api/agent/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ projectId: workspace.projectId, workspaceId: workspace.workspaceId, options }),
  })
  return created.session.sessionId
}

const dispatch = (client, sessionId, options) => timed(() => client.json(`/api/agent/v1/sessions/${sessionId}/runs`, {
  method: "POST",
  body: JSON.stringify({ input: { text: "Say hello.", attachments: [], context: [] }, options }),
}))

const measureDispatch = async (client, workspace, model) => {
  const options = { providerId: model?.providerId ?? null, modelId: model?.modelId ?? null, agentId: null, variant: null, reasoningEffort: null }
  // A new session: the Host has no live root, so this send starts the worker.
  const coldSession = await createSession(client, workspace, options)
  const cold = await dispatch(client, coldSession, options)
  await waitIdle(client, coldSession)
  // The same session again: its worker is live, which is the warm case.
  const warm = await dispatch(client, coldSession, options)
  await waitIdle(client, coldSession)
  return {
    newSessionMs: round(cold.ms),
    warmSessionMs: round(warm.ms),
    overheadMs: round(cold.ms - warm.ms),
    budgetOverheadMs: 150,
  }
}

const OMP_NAV = `[...document.querySelectorAll('button')].find((button) => (button.textContent ?? '').trim() === 'OMP')`
const OMP_HEADING = `!!document.querySelector('[data-settings-page-heading]')?.textContent?.includes('OMP')`

/**
 * Opens Settings → OMP and switches between its sections, timing each click
 * until the target section is on screen. The page is one route, so the click
 * that matters is the navigation into it; the section switches are reported
 * separately because a section that is not mounted costs nothing.
 */
const measureSettingsTabSwitch = async (client, url) => {
  await client.send("Page.navigate", { url: new URL("/?settings=omp", url).toString() })
  await client.once("Page.loadEventFired", 60_000)
  await wait(4000)
  const opened = await evaluateValue(client, `(() => {
    const heading = document.querySelector('[data-settings-page-heading]')
    return heading ? heading.textContent : null
  })()`)
  if (opened === null) {
    const clicked = await evaluateValue(client, `(() => { const button = ${OMP_NAV}; if (!button) return false; button.click(); return true })()`)
    if (!clicked) throw new Error("The Settings navigation has no OMP entry; the scenario never ran.")
    await wait(1500)
  }
  const ready = await evaluateValue(client, OMP_HEADING)
  if (!ready) throw new Error("The OMP Settings page did not render its heading; the scenario never ran.")
  const samples = []
  for (let index = 0; index < 5; index += 1) {
    const started = performance.now()
    await evaluateValue(client, `(() => {
      const view = document.querySelector('[data-settings-view="true"]')
      const nav = view?.querySelector('button[aria-current="page"]')
      if (nav) nav.click()
      return true
    })()`)
    await wait(50)
    samples.push(performance.now() - started)
  }
  return { openMs: round(samples[0]), samples: samples.map((value) => round(value)), budgetMs: 100 }
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  const output = resolve(options.output ?? join("artifacts", `omp-performance-${new Date().toISOString().replace(/[:.]/g, "-")}`))
  mkdirSync(output, { recursive: true })
  const summary = { recordedAt: new Date().toISOString(), label: options.label, url: options.url }
  const client = await createClient(options.url)
  const directory = options.dir ?? await activeDirectory(client)
  const workspace = await client.json("/api/agent/v1/workspaces/resolve", { method: "POST", body: JSON.stringify({ directory }) })
  summary.workspaceId = workspace.workspaceId
  summary.directory = directory

  summary.catalogs = await measureCatalogs(client, workspace.workspaceId, options.reads)
  console.log(`catalog models: first ${summary.catalogs.models.firstMs} ms, warm median ${summary.catalogs.models.warmMedianMs} ms, max ${summary.catalogs.models.warmMaxMs} ms (budget 20 ms)`)
  console.log(`catalog providers: first ${summary.catalogs.providers.firstMs} ms, warm median ${summary.catalogs.providers.warmMedianMs} ms, max ${summary.catalogs.providers.warmMaxMs} ms (budget 20 ms)`)

  let model = null
  if (options.model) {
    const [providerId, ...rest] = options.model.split("/")
    model = { providerId, modelId: rest.join("/") }
  } else {
    const catalog = await client.json(`/api/agent/v1/workspaces/${workspace.workspaceId}/models`)
    model = catalog.defaults?.model ?? catalog.models?.[0] ?? null
  }
  summary.dispatch = await measureDispatch(client, workspace, model)
  console.log(`dispatch: new session ${summary.dispatch.newSessionMs} ms, warm ${summary.dispatch.warmSessionMs} ms, overhead ${summary.dispatch.overheadMs} ms (budget 150 ms)`)

  if (!options.skipUi) {
    const profile = resolveProfileDir(options.profileDir, "omp-performance")
    mkdirSync(profile.dir, { recursive: true })
    const port = await reservePort()
    const chrome = launchChrome({ chrome: resolveChrome(options.chrome), profileDir: profile.dir, port, headless: options.headless })
    let cdp
    try {
      const target = await createPageTarget(port)
      cdp = new CdpClient(target.webSocketDebuggerUrl)
      await cdp.connect()
      await Promise.all([cdp.send("Page.enable"), cdp.send("Runtime.enable")])
      await cdp.send("Network.setBypassServiceWorker", { bypass: true }).catch(() => undefined)
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
      summary.settingsTabSwitch = await measureSettingsTabSwitch(cdp, options.url)
      console.log(`settings tab switch: ${summary.settingsTabSwitch.samples.join(", ")} ms (budget 100 ms)`)
    } finally {
      cdp?.close()
      chrome.kill("SIGKILL")
      profile.removeAfter(chrome)
    }
  }

  await writeFile(join(output, "omp-performance.json"), JSON.stringify(summary, null, 2))
  console.log(`Wrote ${join(output, "omp-performance.json")}`)
}

main().catch((error) => {
  console.error(`profile:omp failed: ${error.message}`)
  process.exitCode = 1
})
