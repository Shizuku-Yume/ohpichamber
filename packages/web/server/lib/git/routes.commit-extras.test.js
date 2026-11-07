import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { registerGitRoutes } from './routes.js';

/**
 * `POST /api/git/commit` with the two optional extras against a real
 * repository. The properties under test are the ones a user feels: a commit
 * with notes carries a note, a commit with Change-Id carries one trailer, a
 * message that already has one is never amended again, no extras means the
 * untouched direct commit, and a failed extra never reports a clean commit.
 */

let directory;
const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
const savedEnvironment = {};

afterEach(() => {
 if (directory) fs.rmSync(directory, { recursive: true, force: true });
 directory = undefined;
 for (const [key, value] of Object.entries(savedEnvironment)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
 }
 for (const key of Object.keys(savedEnvironment)) delete savedEnvironment[key];
});

// The routes run their own git, so the identity lives in the repository: CI
// runners have no global one.
const createRepository = () => {
 directory = fs.mkdtempSync(path.join(os.tmpdir(), 'commit-extras-'));
 git('init', '-q', '-b', 'main');
 git('config', 'user.name', 'T');
 git('config', 'user.email', 't@example.com');
 git('commit', '--allow-empty', '-q', '-m', 'Base');
};

const appWith = () => {
 const app = express();
 app.use(express.json());
 registerGitRoutes(app, {});
 return app;
};

const writeStagedFile = (name, content) => {
 fs.writeFileSync(path.join(directory, name), content);
 git('add', name);
};

const post = (app, body) => request(app).post('/api/git/commit').query({ directory }).send(body);

describe('POST /api/git/commit extras', () => {
 it('keeps the plain direct commit when no extra is requested', async () => {
  createRepository();
  writeStagedFile('a.txt', 'one');
  const head = git('rev-parse', 'HEAD');

  const response = await post(appWith(), { message: 'feat: plain commit', files: ['a.txt'] }).expect(200);
  expect(response.body.success).toBe(true);
  expect(response.body.commit).toBe(git('rev-parse', 'HEAD'));
  expect(response.body.commit).not.toBe(head);
  expect(response.body.changeId).toBeUndefined();
  expect(response.body.notes).toBeUndefined();
  // No amend, no note, no trailer: the old path is byte-for-byte the same.
  expect(git('log', '-1', '--format=%B')).toBe('feat: plain commit');
  expect(git('notes', 'list')).toBe('');
 });

 it('writes one Git note on the new commit when notes are requested', async () => {
  createRepository();
  writeStagedFile('a.txt', 'one');

  const response = await post(appWith(), { message: 'feat: noted commit', files: ['a.txt'], notes: true }).expect(200);
  expect(response.body.notes).toBe(true);
  expect(git('notes', 'show', response.body.commit)).toBe('feat: noted commit');
  expect(git('log', '-1', '--format=%B')).toBe('feat: noted commit');
  expect(git('notes', 'list').split('\n')).toHaveLength(1);
 });

 it('adds exactly one Change-Id trailer and reports the amended commit', async () => {
  createRepository();
  writeStagedFile('a.txt', 'one');

  const response = await post(appWith(), { message: 'feat: reviewed change', files: ['a.txt'], changeId: true }).expect(200);
  expect(response.body.changeId).toMatch(/^I[0-9a-f]{40}$/);
  expect(response.body.commit).toBe(git('rev-parse', 'HEAD'));
  const message = git('log', '-1', '--format=%B');
  expect(message).toContain(`Change-Id: ${response.body.changeId}`);
  expect(message.match(/Change-Id:/g)).toHaveLength(1);
 });

 it('never adds a second Change-Id to a message that already carries one', async () => {
  createRepository();
  writeStagedFile('a.txt', 'one');
  const app = appWith();
  const message = 'feat: already reviewed\n\nChange-Id: I0000000000000000000000000000000000000000';

  const response = await post(app, { message, files: ['a.txt'], changeId: true }).expect(200);
  // The trailer the message carried is kept and reported; the commit is not
  // amended again, so its hash is the one Git created.
  expect(response.body.changeId).toBe('I0000000000000000000000000000000000000000');
  expect(response.body.commit).toBe(git('rev-parse', 'HEAD'));
  expect(git('log', '-1', '--format=%B').match(/Change-Id:/g)).toHaveLength(1);
 });

 it('notes target the amended commit, not the pre-amend one', async () => {
  createRepository();
  writeStagedFile('a.txt', 'one');

  const response = await post(appWith(), { message: 'feat: both extras', files: ['a.txt'], changeId: true, notes: true }).expect(200);
  expect(response.body.commit).toBe(git('rev-parse', 'HEAD'));
  expect(response.body.notes).toBe(true);
  expect(git('notes', 'show', response.body.commit)).toBe('feat: both extras');
  expect(git('notes', 'list').split('\n')).toHaveLength(1);
  expect(git('log', '-1', '--format=%B')).toContain(`Change-Id: ${response.body.changeId}`);
 });

 it('reports a partial commit explicitly instead of claiming success', async () => {
  createRepository();
  writeStagedFile('a.txt', 'one');
  // A failed note write is the realistic partial case. An invalid notes ref
  // makes `git notes add` fail for a real reason rather than a stubbed one.
  savedEnvironment.GIT_NOTES_REF = process.env.GIT_NOTES_REF;
  process.env.GIT_NOTES_REF = 'bad..ref';

  const response = await post(appWith(), { message: 'feat: partial extras', files: ['a.txt'], changeId: true, notes: true }).expect(409);
  expect(response.body.code).toBe('COMMIT_EXTRAS_FAILED');
  expect(response.body.commit).toBe(git('rev-parse', 'HEAD'));
  expect(response.body.extras.changeId).toMatch(/^I[0-9a-f]{40}$/);
  expect(response.body.extras.notes).toBe(false);
  expect(response.body.extras.failed).toEqual([
   expect.objectContaining({ extra: 'notes', code: 'GIT_NOTES_FAILED' }),
  ]);
  // The commit and its Change-Id landed; only the note is missing.
  expect(git('log', '-1', '--format=%B')).toContain(`Change-Id: ${response.body.extras.changeId}`);
 });

 it('rejects non-boolean extras without touching the repository', async () => {
  createRepository();
  writeStagedFile('a.txt', 'one');
  const head = git('rev-parse', 'HEAD');

  await post(appWith(), { message: 'feat: rejected', files: ['a.txt'], changeId: 'yes' }).expect(400);
  expect(git('rev-parse', 'HEAD')).toBe(head);
  expect(git('status', '--porcelain')).toBe('A  a.txt');
 });
});
