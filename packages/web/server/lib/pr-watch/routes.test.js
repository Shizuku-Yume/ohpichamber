import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerPrWatchRoutes } from './runtime.js';

describe('registerPrWatchRoutes', () => {
  it('serves GET and DELETE for pr-watch sessions', async () => {
    const app = express();
    const runtime = {
      load: async () => { },
      snapshot: () => ({ revision: 1, watches: [] }),
      unwatch: async (sessionID) => ({ unwatched: true, sessionID }),
    };
    registerPrWatchRoutes(app, runtime);

    const getRes = await request(app).get('/api/pr-watch').expect(200);
    expect(getRes.body).toEqual({ revision: 1, watches: [] });

    const delRes = await request(app)
      .delete('/api/pr-watch/sessions/ses_pr_1')
      .expect(200);
    expect(delRes.body).toEqual({ unwatched: true, sessionID: 'ses_pr_1' });
  });

  it('handles errors with proper HTTP status', async () => {
    const app = express();
    const runtime = {
      load: async () => {
        throw Object.assign(new Error('Failed to load'), { status: 500 });
      },
    };
    registerPrWatchRoutes(app, runtime);

    const res = await request(app).get('/api/pr-watch').expect(500);
    expect(res.body).toEqual({ error: 'Failed to load' });
  });
});
