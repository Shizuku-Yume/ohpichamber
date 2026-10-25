import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAttachmentStore } from './attachment-store.js';
import { openHostMetadataDatabase } from './metadata-sqlite.js';

describe('attachment store', () => {
  let dir, database, store;
  const scope = { projectId: 'p', workspaceId: 'w', agentDirectoryId: 'a' };
  beforeEach(async () => { dir = await mkdtemp(path.join(os.tmpdir(), 'att-')); database = openHostMetadataDatabase({ dataDir: dir }).db; store = createAttachmentStore({ database, storageDirectory: path.join(dir, 'attachments') }); });
  afterEach(async () => { await store.close(); database.close(); await rm(dir, { recursive: true, force: true }); });
  it('persists opaque metadata and resolves scoped files', async () => {
    const bytes = Buffer.from('text fixture'); const uploaded = await store.upload(scope, { metadata: { name: 'x.txt', mediaType: 'text/plain', size: bytes.length }, bytes });
    expect(uploaded.attachmentId).toMatch(/^att_/); expect(uploaded.uri).toBe(`attachment://${uploaded.attachmentId}`);
    const { createdAt, ...submitted } = uploaded;
    const resolved = await store.resolveAttachments(scope, [submitted]); expect(resolved[0].path).toContain(`${uploaded.attachmentId}.bin`);
    await expect(store.read({ ...scope, workspaceId: 'other' }, uploaded.attachmentId)).rejects.toMatchObject({ code: 'ATTACHMENT_NOT_FOUND' });
  });
  it('rejects forged metadata and wrong directory scope', async () => {
    const bytes = Buffer.from('hello');
    const uploaded = await store.upload(scope, { metadata: { name: 'x.txt', mediaType: 'text/plain', size: bytes.length }, bytes });
    const { createdAt, ...submitted } = uploaded;
    await expect(store.resolveAttachments(scope, [{ ...submitted, name: 'forged.txt' }])).rejects.toMatchObject({ code: 'ATTACHMENT_METADATA_MISMATCH' });
    await expect(store.resolveAttachments({ ...scope, agentDirectoryId: 'other' }, [submitted])).rejects.toMatchObject({ code: 'ATTACHMENT_NOT_FOUND' });
  });
  it('admits only bounded valid text and images for prompt delivery', async () => {
    const upload = async (name, mediaType, bytes) => store.upload(scope, { metadata: { name, mediaType, size: bytes.length }, bytes });
    const promptAttachment = (attachment) => { const { createdAt, ...value } = attachment; return value; };
    const [text, image, archive, large, binaryText] = await Promise.all([
      upload('notes.txt', 'text/plain', Buffer.from('hello')),
      upload('photo.png', 'image/png', Buffer.from([0, 1, 2])),
      upload('bundle.zip', 'application/zip', Buffer.from('PK')),
      upload('large.txt', 'text/plain', Buffer.alloc(500_001, 0x61)),
      upload('invalid.txt', 'text/plain', Buffer.from([0xff])),
    ]);
    const resolved = await store.resolveAttachments(scope, [promptAttachment(text), promptAttachment(image)]);
    expect(resolved).toHaveLength(2);
    await expect(store.resolveAttachments(scope, [promptAttachment(archive)])).rejects.toMatchObject({ code: 'INVALID_REQUEST', statusCode: 400, message: expect.stringContaining('bundle.zip') });
    await expect(store.resolveAttachments(scope, [promptAttachment(large)])).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE', statusCode: 413 });
    await expect(store.resolveAttachments(scope, [promptAttachment(binaryText)])).rejects.toMatchObject({ code: 'INVALID_REQUEST', statusCode: 400 });
  });
  it('caps aggregate text attachment characters per prompt', async () => {
    const bytes = Buffer.alloc(500_000, 0x61);
    const first = await store.upload(scope, { metadata: { name: 'first.txt', mediaType: 'text/plain', size: bytes.length }, bytes });
    const secondBytes = Buffer.from('b');
    const second = await store.upload(scope, { metadata: { name: 'second.txt', mediaType: 'text/plain', size: secondBytes.length }, bytes: secondBytes });
    const third = await store.upload(scope, { metadata: { name: 'third.txt', mediaType: 'text/plain', size: bytes.length }, bytes });
    const submitted = ({ createdAt, ...attachment }) => attachment;
    await expect(store.resolveAttachments(scope, [submitted(first), submitted(second), submitted(third)])).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE', statusCode: 413 });
  });
});
