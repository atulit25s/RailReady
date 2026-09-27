import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server.js';

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

test('GET /api/health returns 200 and system status', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.status, 'online');
  assert.match(res.body.system, /RailReady/);
});

test('GET /api/nonexistent returns 404', async () => {
  const res = await request(app).get('/api/nonexistent');
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});
