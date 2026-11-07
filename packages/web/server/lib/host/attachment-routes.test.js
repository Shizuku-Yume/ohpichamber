import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAttachmentStore } from './attachment-store.js';
import { openHostMetadataDatabase } from './metadata-sqlite.js';
import { createAttachmentRoutes } from './attachment-routes.js';

describe('attachment routes', () => {
  let dir, database, store, app;
  const scope = { projectId: 'p', workspaceId: 'w', agentDirectoryId: 'a' };

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'att-routes-'));
    database = openHostMetadataDatabase({ dataDir: dir }).db;
    store = createAttachmentStore({ database, storageDirectory: path.join(dir, 'attachments') });
    app = express();
    app.use('/api/agent/v1/attachments', createAttachmentRoutes({
      express,
      store,
      resolveWorkspaceScope: async (id) => (id === 'w' ? scope : null),
    }));
  });

  afterEach(async () => {
    await store.close();
    database.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('accepts a binary non-image attachment: the worker hands it off as a read target', async () => {
    const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff]).toString('base64');
    const res = await request(app)
      .post('/api/agent/v1/attachments')
      .send({
        workspaceId: 'w',
        metadata: {
          name: 'archive.zip',
          mediaType: 'application/zip',
          size: 4,
        },
        data: binaryData,
      });

    expect(res.status).toBe(201);
    expect(res.body.uri).toBe(`attachment://${res.body.attachmentId}`);
  });

  it('accepts a text file containing null bytes rather than refusing it', async () => {
    const binaryData = Buffer.from('hello\x00world').toString('base64');
    const res = await request(app)
      .post('/api/agent/v1/attachments')
      .send({
        workspaceId: 'w',
        metadata: {
          name: 'sneaky.txt',
          mediaType: 'text/plain',
          size: 11,
        },
        data: binaryData,
      });

    expect(res.status).toBe(201);
    expect(res.body.size).toBe(11);
  });

  it('still refuses an upload past the configured transport cap', async () => {
    const small = express();
    small.use('/api/agent/v1/attachments', createAttachmentRoutes({
      express,
      store,
      resolveWorkspaceScope: async (id) => (id === 'w' ? scope : null),
      maxBytes: 1024,
    }));
    const buffer = Buffer.alloc(1025, 0x61);
    const res = await request(small)
      .post('/api/agent/v1/attachments')
      .send({
        workspaceId: 'w',
        metadata: { name: 'huge.txt', mediaType: 'text/plain', size: buffer.length },
        data: buffer.toString('base64'),
      });

    expect(res.status).toBe(413);
    expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('accepts a valid small text attachment with 201', async () => {
    const textData = Buffer.from('Hello world!').toString('base64');
    const res = await request(app)
      .post('/api/agent/v1/attachments')
      .send({
        workspaceId: 'w',
        metadata: {
          name: 'notes.txt',
          mediaType: 'text/plain',
          size: 12,
        },
        data: textData,
      });

    expect(res.status).toBe(201);
    expect(res.body.attachmentId).toMatch(/^att_/);
    expect(res.body.uri).toBe(`attachment://${res.body.attachmentId}`);
  });
});
