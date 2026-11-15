import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerAutoReviewRoutes } from './runtime.js';

describe('registerAutoReviewRoutes', () => {
  it('serves GET, POST, and DELETE for auto-review runs', async () => {
    const app = express();
    app.use(express.json());
    const runtime = {
      load: async () => { },
      snapshot: () => ({ revision: 1, runs: [] }),
      startRun: async (body) => ({ status: 'started', body }),
      removeRun: async (originalSessionID) => ({ removed: true, originalSessionID }),
    };
    registerAutoReviewRoutes(app, runtime);

    const getRes = await request(app).get('/api/auto-review').expect(200);
    expect(getRes.body).toEqual({ revision: 1, runs: [] });

    const postRes = await request(app)
      .post('/api/auto-review/runs')
      .send({ originalSessionID: 'ses_1', reviewSessionID: 'ses_2' })
      .expect(200);
    expect(postRes.body).toEqual({ status: 'started', body: { originalSessionID: 'ses_1', reviewSessionID: 'ses_2' } });

    const delRes = await request(app)
      .delete('/api/auto-review/runs/ses_1')
      .expect(200);
    expect(delRes.body).toEqual({ removed: true, originalSessionID: 'ses_1' });
  });

  it('handles errors with proper HTTP status', async () => {
    const app = express();
    app.use(express.json());
    const runtime = {
      load: async () => { },
      startRun: async () => {
        throw Object.assign(new Error('Already running'), { status: 409 });
      },
    };
    registerAutoReviewRoutes(app, runtime);

    const res = await request(app).post('/api/auto-review/runs').send({}).expect(409);
    expect(res.body).toEqual({ error: 'Already running' });
  });
});
