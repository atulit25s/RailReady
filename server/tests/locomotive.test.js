import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server.js';
import { User } from '../models/User.js';
import { Locomotive } from '../models/Locomotive.js';

let adminToken;
let createdLocoId;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/railready_test');
  }
  await User.deleteMany({});
  await Locomotive.deleteMany({});

  const admin = await User.create({
    name: 'Fleet Manager',
    email: 'manager.loco@railready.local',
    password: 'password123',
    role: 'manager'
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'manager.loco@railready.local',
    password: 'password123'
  });
  adminToken = loginRes.body.token;
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

test('POST /api/locomotives - creates new locomotive with generated QR code', async () => {
  const res = await request(app)
    .post('/api/locomotives')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      locoNumber: '30215',
      locoClass: 'WAP-7',
      shed: 'Kalyan ELS',
      currentLocation: 'Pit 2'
    });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.locoNumber, '30215');
  assert.ok(res.body.data.qrCodeData);
  createdLocoId = res.body.data._id;
});

test('GET /api/locomotives - lists locomotives with filters and pagination', async () => {
  const res = await request(app)
    .get('/api/locomotives?locoClass=WAP-7')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.count, 1);
});

test('GET /api/locomotives/:id - retrieves aggregated 7-tab details', async () => {
  const res = await request(app)
    .get(`/api/locomotives/${createdLocoId}`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.locomotive.locoNumber, '30215');
  assert.ok(Array.isArray(res.body.data.inspections));
  assert.ok(Array.isArray(res.body.data.defects));
  assert.ok(Array.isArray(res.body.data.maintenanceTasks));
  assert.ok(Array.isArray(res.body.data.deployments));
});

test('GET /api/locomotives/:id/qr - returns standalone QR payload', async () => {
  const res = await request(app)
    .get(`/api/locomotives/${createdLocoId}/qr`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.locoNumber, '30215');
  assert.ok(res.body.data.qrCode.startsWith('data:image/png;base64,'));
});
