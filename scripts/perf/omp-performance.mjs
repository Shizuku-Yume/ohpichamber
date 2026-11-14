/**
 * The R8 and new-chat latency numbers, measured on a running OpenChamber server.
 *
 * Budgets:
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
 * - **New chat latency (create → run → first event)**: on a fresh chat,
 *   `POST /sessions` p50 must be ≤ 400 ms, and the first `part.delta` event
 *   after send must arrive within ≤ 600 ms.
 * - **Stream cadence**: the UI event pipeline flushes live streaming events
 *   every 33 ± 5 ms.
 *
 * The catalog, dispatch, and new-chat numbers are HTTP/SSE timings against the
 * server the caller names; the tab switch is measured in a real Chrome through CDP.
 * A run writes `omp-performance.json` so two builds can be compared field by field.
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
import { parseModelSelector } from "../../packages/agent-contract/src/index.ts"
import { createEventPipeline } from "../../packages/ui/src/sync/event-pipeline.ts"

const HELP = `Usage: bun run profile:omp -- [options]

Measures the R8, new-chat, and stream-cadence budgets: the OMP Settings tab switch, prompt dispatch on a new
versus a warm session, repeated model/provider catalog reads, new chat latency, and stream cadence.

Options:
  --url <url>              OpenChamber URL (default: http://localhost:3000)
  --dir <path>             Project directory the workspace resolves to
                           (default: the server's active project)
  --model <provider/model> Model the dispatch scenario sends with
                           (default: the workspace's default model)
  --reads <n>              Catalog reads to time (default: 8)
  --new-chat-runs <n>      New chat iterations to time (default: 5)
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
  const options = { url: "http://localhost:3000", dir: null, model: null, reads: 8, newChatRuns: 5, settle: 14, output: null, label: null, chrome: null, profileDir: null, headless: true, skipUi: false }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--help") { console.log(HELP); process.exit(0) }
    else if (value === "--url") options.url = argv[++index]
    else if (value === "--dir") options.dir = resolve(argv[++index])
    else if (value === "--model") options.model = argv[++index]
    else if (value === "--reads") options.reads = Number(argv[++index])
    else if (value === "--new-chat-runs") options.newChatRuns = Number(argv[++index])
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
  if (!Number.isInteger(options.newChatRuns) || options.newChatRuns < 2) throw new Error("--new-chat-runs must be at least 2")
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
  return { json, cookie, baseUrl }
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

/**
 * Measures the new-chat latency: create → run → first event.
 *
 * For each iteration on a fresh session:
 * 1. POST /sessions: times the session creation.
 * 2. Attaches the SSE event stream (/api/agent/v1/sessions/:id/events).
 * 3. POST /runs: dispatches the opening prompt.
 * 4. Waits for the first part.delta on the event stream.
 *
 * Budgets:
 * - POST /sessions p50 ≤ 400 ms
 * - first part.delta after send on a new chat ≤ 600 ms
 */
const measureCreateRunFirstEvent = async (client, workspace, model, iterations = 5) => {
  const options = { providerId: model?.providerId ?? null, modelId: model?.modelId ?? null, agentId: null, variant: null, reasoningEffort: null }
  const createSessionSamples = []
  const firstDeltaAfterSendSamples = []
  const firstDeltaAfterRunSamples = []

  for (let index = 0; index < iterations; index += 1) {
    // Mirror the UI opening the new-chat composer for the workspace before the user sends
    await client.json("/api/agent/v1/sessions/prepare", {
      method: "POST",
      body: JSON.stringify({ projectId: workspace.projectId, workspaceId: workspace.workspaceId }),
    })

    const sendStarted = performance.now()
    const sessionRes = await timed(() => client.json("/api/agent/v1/sessions", {
      method: "POST",
      body: JSON.stringify({ projectId: workspace.projectId, workspaceId: workspace.workspaceId, options }),
    }))
    createSessionSamples.push(sessionRes.ms)
    const session = sessionRes.value.session
    const sessionId = session.sessionId
    const cursor = `${session.epoch}:${session.headSequence}`

    // Attach the SSE stream before dispatching the run.
    const controller = new AbortController()
    const streamUrl = new URL(`/api/agent/v1/sessions/${sessionId}/events?cursor=${encodeURIComponent(cursor)}`, client.baseUrl)
    const streamResponse = await fetch(streamUrl, {
      headers: { cookie: client.cookie, origin: client.baseUrl, accept: "text/event-stream", "Last-Event-ID": cursor },
      signal: controller.signal,
    })
    if (!streamResponse.ok || !streamResponse.body) {
      controller.abort()
      throw new Error(`SSE stream connection failed with HTTP ${streamResponse.status}`)
    }

    const reader = streamResponse.body.getReader()
    const decoder = new TextDecoder()
    let firstDeltaTime = null

    const readUntilDelta = (async () => {
      let buffer = ""
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.type === "part.delta") {
                firstDeltaTime = performance.now()
                return
              }
            } catch { }
          }
        }
      }
    })()

    // Dispatch the prompt
    const postRunStarted = performance.now()
    await client.json(`/api/agent/v1/sessions/${sessionId}/runs`, {
      method: "POST",
      body: JSON.stringify({ input: { text: "Say hello.", attachments: [], context: [] }, options }),
    })

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for part.delta")), 30_000))
    await Promise.race([readUntilDelta, timeoutPromise])

    controller.abort()
    reader.cancel().catch(() => { })

    if (firstDeltaTime === null) throw new Error("Did not receive part.delta event")

    firstDeltaAfterSendSamples.push(firstDeltaTime - sendStarted)
    firstDeltaAfterRunSamples.push(firstDeltaTime - postRunStarted)

    await waitIdle(client, sessionId)
  }

  return {
    createSession: {
      p50Ms: percentile(createSessionSamples, 0.5),
      minMs: round(Math.min(...createSessionSamples)),
      maxMs: round(Math.max(...createSessionSamples)),
      samples: createSessionSamples.map((v) => round(v)),
      budgetMs: 400,
    },
    firstDeltaAfterSend: {
      p50Ms: percentile(firstDeltaAfterSendSamples, 0.5),
      minMs: round(Math.min(...firstDeltaAfterSendSamples)),
      maxMs: round(Math.max(...firstDeltaAfterSendSamples)),
      samples: firstDeltaAfterSendSamples.map((v) => round(v)),
      budgetMs: 600,
    },
    firstDeltaAfterRun: {
      p50Ms: percentile(firstDeltaAfterRunSamples, 0.5),
      samples: firstDeltaAfterRunSamples.map((v) => round(v)),
    },
  }
}

/**
 * Measures the event pipeline flush cadence against live SSE stream deltas.
 *
 * Budget:
 * - flushes every 33 ± 5 ms
 */
const measureStreamCadence = async (client, workspace, model) => {
  const options = { providerId: model?.providerId ?? null, modelId: model?.modelId ?? null, agentId: null, variant: null, reasoningEffort: null }
  const sessionRes = await client.json("/api/agent/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ projectId: workspace.projectId, workspaceId: workspace.workspaceId, options }),
  })
  const session = sessionRes.session
  const sessionId = session.sessionId
  const cursor = `${session.epoch}:${session.headSequence}`
  const controller = new AbortController()
  const streamUrl = new URL(`/api/agent/v1/sessions/${sessionId}/events?cursor=${encodeURIComponent(cursor)}`, client.baseUrl)
  const streamResponse = await fetch(streamUrl, {
    headers: { cookie: client.cookie, origin: client.baseUrl, accept: "text/event-stream" },
    signal: controller.signal,
  })
  if (!streamResponse.ok || !streamResponse.body) {
    controller.abort()
    throw new Error(`SSE stream connection failed with HTTP ${streamResponse.status}`)
  }

  const flushTimes = []
  let onEventCallback = null
  const pipelineClient = {
    subscribeSessionEvents: (_sid, _cur, onEvent) => {
      onEventCallback = onEvent
      return () => { }
    },
  }
  const pipeline = createEventPipeline({
    client: pipelineClient,
    isCurrent: () => true,
    onEvents: () => {
      flushTimes.push(performance.now())
      return true
    },
    recover: async () => { },
  })
  pipeline.attach({ directory: workspace.path, sessionId }, { cursor, session: { sessionId, runtimeStatus: "running" } })

  const reader = streamResponse.body.getReader()
  const decoder = new TextDecoder()
  const readPromise = (async () => {
    let buffer = ""
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6))
            onEventCallback?.(parsed)
            if (parsed.type === "turn.completed" || parsed.type === "run.completed") return
          } catch { }
        }
      }
    }
  })()

  await client.json(`/api/agent/v1/sessions/${sessionId}/runs`, {
    method: "POST",
    body: JSON.stringify({ input: { text: "Count from 1 to 20.", attachments: [], context: [] }, options }),
  })

  await Promise.race([readPromise, wait(30_000)])
  controller.abort()
  pipeline.cleanup()
  await waitIdle(client, sessionId)

  const intervals = []
  for (let i = 1; i < flushTimes.length; i++) {
    intervals.push(round(flushTimes[i] - flushTimes[i - 1]))
  }
  const warmIntervals = intervals.slice(1)
  const activeIntervals = warmIntervals.length ? warmIntervals : intervals
  return {
    p50IntervalMs: percentile(activeIntervals, 0.5),
    minIntervalMs: round(Math.min(...activeIntervals)),
    maxIntervalMs: round(Math.max(...activeIntervals)),
    samples: activeIntervals,
    budgetIntervalMs: 33,
    budgetToleranceMs: 5,
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
    const parsed = parseModelSelector(options.model)
    model = parsed ? { providerId: parsed.providerId, modelId: parsed.modelId } : null
  } else {
    const catalog = await client.json(`/api/agent/v1/workspaces/${workspace.workspaceId}/models`)
    model = catalog.defaults?.model ?? catalog.models?.[0] ?? null
  }
  summary.dispatch = await measureDispatch(client, workspace, model)
  console.log(`dispatch: new session ${summary.dispatch.newSessionMs} ms, warm ${summary.dispatch.warmSessionMs} ms, overhead ${summary.dispatch.overheadMs} ms (budget 150 ms)`)

  summary.newChat = await measureCreateRunFirstEvent(client, workspace, model, options.newChatRuns)
  console.log(`new chat: POST /sessions p50 ${summary.newChat.createSession.p50Ms} ms (budget 400 ms), first part.delta after send p50 ${summary.newChat.firstDeltaAfterSend.p50Ms} ms (budget 600 ms)`)

  summary.streamCadence = await measureStreamCadence(client, workspace, model)
  console.log(`stream cadence: p50 flush interval ${summary.streamCadence.p50IntervalMs} ms (budget 33 ± 5 ms)`)

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
