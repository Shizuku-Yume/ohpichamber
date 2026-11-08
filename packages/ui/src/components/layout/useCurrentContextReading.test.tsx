import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Message, Session } from '@openchamber/agent-contract'
import { useSessionUIStore } from '@/sync/session-ui-store'
import { SyncProvider, useDirectoryStore } from '@/sync/sync-context'
import { installHookTestDom } from '../session/sidebar/test-utils/testDom'
import { useCurrentContextReading } from './useCurrentContextReading'
import { useProjectsStore } from '@/stores/useProjectsStore'

// The header's context readout is on screen for the whole session, so a
// streamed step that leaves the context reading unchanged must not render it.

const DIR = '/repo'
const SESSION_ID = 'ses_1'

const session = (updatedAt: number): Session => ({
  sessionId: SESSION_ID,
  projectId: 'proj_1',
  workspaceId: 'workspace',
  displayPath: DIR,
  rootSessionId: SESSION_ID,
  createdAt: 1,
  updatedAt,
  epoch: 'epoch-1',
  headSequence: '0',
  runtimeStatus: 'idle',
  activeRunId: null,
  mode: { kind: 'main' },
  title: 'One',
  metadata: null,
  metadataRevision: '0',
  archiveRevision: '0',
})

const assistant = (messageId: string, total: number): Message => ({
  messageId,
  sessionId: SESSION_ID,
  turnId: 'turn_1',
  role: 'assistant',
  parts: [{ type: 'text', partId: `${messageId}_part`, content: 'test' }],
  createdAt: 10,
  usage: {
    input: total,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: total,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  },
})

let store: ReturnType<typeof useDirectoryStore> | null = null
let renders = 0

const ReadingProbe = () => {
  useCurrentContextReading()
  return null
}

const StoreProbe = () => {
  store = useDirectoryStore(DIR, { bootstrap: false })
  return null
}

describe('useCurrentContextReading', () => {
  let dom: ReturnType<typeof installHookTestDom>
  let root: Root
  let restoreSpies: Array<() => void>
  let previousSurface: typeof window.__OPENCHAMBER_SURFACE__
  let previousSessionUI: ReturnType<typeof useSessionUIStore.getState>

  const seed = async (sessions: Session[], messages: Message[]) => {
    await act(async () => store!.setState({ session: sessions, message: { [SESSION_ID]: messages } }))
  }

  beforeEach(async () => {
    dom = installHookTestDom()
    previousSurface = window.__OPENCHAMBER_SURFACE__
    window.__OPENCHAMBER_SURFACE__ = 'desktop'
    restoreSpies = []
    previousSessionUI = useSessionUIStore.getState()
    useProjectsStore.setState({ projects: [{ id: 'repo', path: DIR }] })
    useSessionUIStore.setState({ currentSessionId: SESSION_ID, currentSessionDirectory: DIR })
    root = createRoot(dom.container)
    store = null
    renders = 0
    await act(async () => root.render(
      <SyncProvider directory="">
        <StoreProbe />
        <React.Profiler id="reading" onRender={() => { renders += 1 }}>
          <ReadingProbe />
        </React.Profiler>
      </SyncProvider>,
    ))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    useSessionUIStore.setState({
      currentSessionId: previousSessionUI.currentSessionId,
      currentSessionDirectory: previousSessionUI.currentSessionDirectory,
    })
    restoreSpies.forEach((restore) => restore())
    window.__OPENCHAMBER_SURFACE__ = previousSurface
    dom.restore()
  })

  test('streamed steps with the same reading do not render the reader', async () => {
    await seed([session(1)], [assistant('msg_1', 50_000)])
    const settled = renders
    expect(settled).toBeGreaterThan(0)

    for (let step = 2; step < 12; step += 1) {
      await seed([session(step)], [assistant('msg_1', 50_000)])
    }

    expect(renders).toBe(settled)
  })

  test('a new reading and a cleared session still render it', async () => {
    await seed([session(1)], [assistant('msg_1', 50_000)])
    const measured = renders

    await seed([session(2)], [assistant('msg_1', 50_000), assistant('msg_2', 100_000)])
    expect(renders).toBe(measured + 1)

    await seed([session(3)], [])
    expect(renders).toBe(measured + 2)
  })
})
