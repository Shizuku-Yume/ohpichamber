// The dispatcher in front of a real space on a real Docker daemon. Runs only with
// OPENCHAMBER_TEST_DOCKER=1. The host of `host.js` is mounted the way `server/index.js` mounts
// it: the dispatcher and the socket forwarder in front of an Express app.
//
// The merged session list, the per-space event connection and the in-space session route were
// OpenCode's shapes; they went with that runtime, and the OMP session/event contract brings its
// own suite. What stays is the transport itself: the terminal over the prefix, the guards, and
// the host's own routes staying reachable when a space is killed under an open socket.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import express from 'express';
import { WebSocket } from 'ws';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runCommand } from '../run-command.js';
import { createSpacesHost } from '../host.js';
import { ROLE_SPACE, createSpaceId, hashProjectDirectory, spaceResourceName } from '../labels.js';
import { LIVE_DOCKER_ENABLED, createLiveDockerPlace } from './docker-live-support.js';

const CREATE_TIMEOUT_MS = 25 * 60_000;
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const listen = (app) => new Promise((resolve) => {
  const server = http.createServer(app);
  server.listen(0, '127.0.0.1', () => resolve(server));
});
const frame = (payload) => Buffer.concat([Buffer.from([1]), Buffer.from(JSON.stringify(payload), 'utf8')]);

describe.skipIf(!LIVE_DOCKER_ENABLED)('dispatcher over a real space: docker (live)', () => {
  const spec = {
    id: createSpaceId(),
    name: 'Sessions live',
    project: hashProjectDirectory('/sessions/live/project'),
    created: new Date().toISOString(),
    memoryBytes: 2 * 1024 * 1024 * 1024,
  };
  const repo = `/spaces/${spec.id}/repo`;
  let place;
  let dispose = async () => {};
  let dataDir;
  let host;
  let server;
  let hostRouteRuns = 0;
  const url = (suffix) => `http://127.0.0.1:${server.address().port}${suffix}`;
  const wsUrl = (suffix) => `ws://127.0.0.1:${server.address().port}${suffix}`;
  const shell = async (script) => {
    const result = await place.exec(spec.id, ['sh', '-c', script]);
    expect(result.code, `${script}: ${result.stderr}`).toBe(0);
    return result.stdout;
  };

  beforeAll(async () => {
    ({ place, dispose } = createLiveDockerPlace());
    await place.create(spec);
    await shell(`mkdir -p ${repo} && cd ${repo} && git init -q . && git -c user.email=space@example.invalid -c user.name=Space commit -q --allow-empty -m init`);
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openchamber-sessions-live-'));
    // The production gate is closed; the transport below is what the OMP runtime keeps.
    host = createSpacesHost({ dataDir, place, requireReleased: () => {}, logger: { warn: () => {} } });

    const app = express();
    app.use(host.middleware);
    app.all('/api/git/status', (req, res) => { hostRouteRuns += 1; res.json({ ranOnHost: true, directory: req.query.directory ?? null }); });
    server = await listen(app);
    host.prepareUpgrades({ uiAuthController: { enabled: false }, isRequestOriginAllowed: async () => true });
    server.on('upgrade', host.upgradeHandler);
  }, CREATE_TIMEOUT_MS);

  afterAll(async () => {
    host?.close();
    await new Promise((resolve) => { if (server) { server.closeAllConnections?.(); server.close(() => resolve()); } else resolve(); });
    await dispose();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('runs a command inside as uid 1000 over the terminal socket under the prefix', async () => {
    const created = await fetch(url(`/api/spaces/${spec.id}/terminal/create`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cwd: repo, cols: 80, rows: 24 }) });
    expect(created.status, await created.clone().text()).toBe(200);
    const { sessionId } = await created.json();
    const socket = new WebSocket(wsUrl(`/api/spaces/${spec.id}/terminal/ws`), { headers: { origin: 'http://app.test' } });
    let output = '';
    let backend = null;
    const done = new Promise((resolve, reject) => {
      socket.on('error', reject);
      socket.on('open', () => socket.send(frame({ t: 'attach', v: 3, s: sessionId })));
      socket.on('message', (raw) => {
        const message = JSON.parse(raw.subarray(1).toString('utf8'));
        if (message.t === 'snapshot') {
          backend = message.ptyBackend;
          socket.send(frame({ t: 'write', v: 3, s: sessionId, d: 'echo space-$((40+2)); id -u\r' }));
        }
        if (message.t === 'output') output += message.d;
        if (/space-42[\s\S]*\n1000\r?\n/.test(output)) resolve();
      });
      setTimeout(() => reject(new Error(`no answer from the terminal in time; output so far: ${output}`)), 30_000).unref();
    });
    await done;
    expect(backend).toBe('node-pty');
    expect(output).toMatch(/space-42\r?\n1000\r?\n/);
    socket.close();
    expect((await fetch(url(`/api/spaces/${spec.id}/terminal/${sessionId}`), { method: 'DELETE' })).status).toBe(200);
  }, 90_000);

  it('refuses a prefixed request for a stopped space, and serves it again after a start', async () => {
    await place.stop(spec.id);
    const stopped = await fetch(url(`/api/spaces/${spec.id}/terminal/sessions`));
    expect(stopped.status).toBe(503);
    expect(await stopped.json()).toMatchObject({ code: 'space_not_running' });

    await place.start(spec.id);
    const again = await fetch(url(`/api/spaces/${spec.id}/terminal/sessions`));
    expect(again.status).toBe(200);
  }, 5 * 60_000);

  it('refuses a prefixed request that names a directory outside the space, and a host-only route', async () => {
    const outside = await fetch(url(`/api/spaces/${spec.id}/terminal/create?directory=${encodeURIComponent('/home/me/project')}`));
    expect(outside.status).toBe(400);
    expect(await outside.json()).toMatchObject({ code: 'directory_outside_space' });
    const hostOnly = await fetch(url(`/api/spaces/${spec.id}/config/settings`));
    expect(hostOnly.status).toBe(403);
    expect(await hostOnly.json()).toMatchObject({ code: 'host_only_route' });
  });

  // The escape check of TESTING.md: a request without the space prefix, but with a space
  // directory, does not run on the host.
  it('refuses an unprefixed request with the space\'s directory before any host route runs', async () => {
    const response = await fetch(url(`/api/git/status?directory=${encodeURIComponent(repo)}`));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'space_directory_needs_prefix' });
    expect(hostRouteRuns).toBe(0);
    const ordinary = await fetch(url('/api/git/status?directory=/tmp'));
    expect(ordinary.status).toBe(200);
    expect(hostRouteRuns).toBe(1);
  });

  // Processes inside are read from /proc, because the image has no pgrep. The match is anchored
  // to the bridge's own command line, so the shell that runs this count is not counted.
  const bridgesInside = async () => Number((await shell('n=0; for p in /proc/[0-9]*; do if tr "\\0" " " < "$p/cmdline" 2>/dev/null | grep -q "^/usr/local/bin/node -e "; then n=$((n+1)); fi; done; echo $n')).trim());

  it('ends the bridge inside when the host closes its connections', async () => {
    expect((await fetch(url(`/api/spaces/${spec.id}/terminal/sessions`))).status).toBe(200);
    expect(await bridgesInside()).toBeGreaterThan(0);
    host.close();
    let left = await bridgesInside();
    for (let attempt = 0; attempt < 40 && left > 0; attempt += 1) {
      await new Promise((resolve) => { setTimeout(resolve, 250); });
      left = await bridgesInside();
    }
    expect(left).toBe(0);
    // The next request opens a new one.
    expect((await fetch(url(`/api/spaces/${spec.id}/terminal/sessions`))).status).toBe(200);
  }, 60_000);

  // The check of the 4b row in STAGES.md: the space killed in the middle of its work.
  it('leaves the host\'s routes untouched when the space is killed under an open socket', async () => {
    const created = await fetch(url(`/api/spaces/${spec.id}/terminal/create`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cwd: repo, cols: 80, rows: 24 }) });
    expect(created.status).toBe(200);
    const { sessionId } = await created.json();
    const socket = new WebSocket(wsUrl(`/api/spaces/${spec.id}/terminal/ws`), { headers: { origin: 'http://app.test' } });
    await new Promise((resolve, reject) => { socket.on('open', resolve); socket.on('error', reject); });
    socket.send(frame({ t: 'attach', v: 3, s: sessionId }));
    socket.send(frame({ t: 'write', v: 3, s: sessionId, d: 'sleep 600\r' }));
    const closed = new Promise((resolve) => socket.on('close', (code, reason) => resolve({ code, reason: reason.toString('utf8') })));

    const kill = await runCommand('docker', ['kill', spaceResourceName(spec.id, ROLE_SPACE)]);
    expect(kill.code, kill.stderr).toBe(0);
    expect(await closed).toMatchObject({ code: expect.any(Number) });
    await sleep(1_000);

    const ordinary = await fetch(url('/api/git/status?directory=/tmp'));
    expect(ordinary.status).toBe(200);
    expect(hostRouteRuns).toBe(2);
  }, 120_000);
});
