import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { registerGitRoutes } from './routes.js';
import { createChangeRequestStatusCache } from '../source-control/status-cache.js';

let directory;
const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
const savedEnvironment = {};
const isolateGitIdentity = () => {
  for (const key of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'EMAIL',
    'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM', 'GIT_CONFIG_SYSTEM']) {
    savedEnvironment[key] = process.env[key];
  }
  for (const key of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'EMAIL']) delete process.env[key];
  // The route's git inherits this process; only its own config may answer.
  process.env.GIT_CONFIG_GLOBAL = '/dev/null';
  process.env.GIT_CONFIG_NOSYSTEM = '1';
  delete process.env.GIT_CONFIG_SYSTEM;
};

afterEach(() => {
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
  for (const [key, value] of Object.entries(savedEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  for (const key of Object.keys(savedEnvironment)) delete savedEnvironment[key];
});

const createRepository = () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'change-id-route-'));
  git('init', '-q', '-b', 'main');
  // The route runs its own git, so the identity lives in the repo: CI runners
  // have no global one.
  git('config', 'user.name', 'T');
  git('config', 'user.email', 't@example.com');
  git('commit', '--allow-empty', '-q', '-m', 'Base');
};

const identityEnvironment = {
  GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com',
  GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com',
};

// A repository whose commit exists but whose configuration names no identity:
// the amend's own `git var GIT_COMMITTER_IDENT` then fails, outside every
// refusal the helper maps.
const createRepositoryWithoutIdentity = () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'change-id-route-'));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: directory });
  execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'Base'], {
    cwd: directory, env: { ...process.env, ...identityEnvironment },
  });
};

const appWith = (options = {}) => {
  const app = express();
  app.use(express.json());
  registerGitRoutes(app, options);
  return app;
};

describe('POST /api/git/change-id', () => {
  it('adds a Change-Id to HEAD and answers the new commit, refusing a stale head', async () => {
    createRepository();
    const head = git('rev-parse', 'HEAD');
    const app = appWith();

    await request(app).post('/api/git/change-id').send({ expectedHead: head }).expect(400);
    const stale = await request(app).post('/api/git/change-id').query({ directory }).send({ expectedHead: 'f'.repeat(40) }).expect(409);
    expect(stale.body).toEqual({ error: 'HEAD moved; nothing was changed', code: 'STALE_HEAD' });
    expect(git('rev-parse', 'HEAD')).toBe(head);

    const response = await request(app).post('/api/git/change-id').query({ directory }).send({ expectedHead: head }).expect(200);
    expect(response.body).toEqual({ sha: git('rev-parse', 'HEAD'), changeId: expect.stringMatching(/^I[0-9a-f]{40}$/) });
    expect(response.body.sha).not.toBe(head);
    // The trailer the review host's commit-msg hook would have written.
    expect(git('log', '-1', '--format=%B')).toContain(`Change-Id: ${response.body.changeId}`);
  });

  it('drops the cached status of the rewritten branch and keeps another branch', async () => {
    createRepository();
    const head = git('rev-parse', 'HEAD');
    // The production consumer: a branch status read for the old tip is stale
    // once the amend moves it, and `invalidateBranchStatus` scopes by branch.
    const cache = createChangeRequestStatusCache({ ttlMs: 90_000 });
    const statusContext = (branch) => ({
      instance: 'github.com', accountId: 'account-1', credentialRevision: 2,
      repositoryId: 'repo-1', bindingRevision: 3, directory, branch, remote: 'origin',
    });
    const status = { identity: { provider: 'github', instance: 'github.com', accountId: 'account-1' }, changeRequest: null };
    cache.store(statusContext('main'), status);
    cache.store(statusContext('feature'), status);
    const app = appWith({
      onBranchRewritten: ({ directory: rewritten, branch }) => cache.invalidate({ directory: rewritten, branch }),
    });

    // A refused amend rewrites nothing, so neither answer is dropped.
    await request(app).post('/api/git/change-id').query({ directory }).send({ expectedHead: 'f'.repeat(40) }).expect(409);
    expect(cache.fresh(statusContext('main'))).not.toBeNull();

    await request(app).post('/api/git/change-id').query({ directory }).send({ expectedHead: head }).expect(200);
    expect(cache.fresh(statusContext('main'))).toBeNull();
    expect(cache.fresh(statusContext('feature'))).not.toBeNull();
  });

  it('answers the fixed 500 body, without Git output, when the amend fails outside a refusal', async () => {
    createRepositoryWithoutIdentity();
    const head = git('rev-parse', 'HEAD');
    isolateGitIdentity();

    const response = await request(appWith())
      .post('/api/git/change-id').query({ directory }).send({ expectedHead: head }).expect(500);

    // `git var GIT_COMMITTER_IDENT` fails without a configured identity. The
    // body is the fixed public error, not the child process's exit code or
    // anything Git printed.
    expect(response.body).toMatchObject({ error: 'Failed to add a Change-Id' });
    expect(Object.keys(response.body).sort()).toEqual(['code', 'error']);
    expect(response.text).not.toContain('git var');
    expect(response.text).not.toContain('Command failed');
    expect(response.text).not.toContain(directory);
    expect(response.text).not.toMatch(/fatal|致命|请告诉我您是谁|@/i);
    expect(git('rev-parse', 'HEAD')).toBe(head);
  });
});
