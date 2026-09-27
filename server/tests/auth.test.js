import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server.js';
import { User } from '../models/User.js';

let adminToken;
let techToken;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/railready_test');
  }
  await User.deleteMany({});

  // Seed Admin & Tech
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@railready.local',
    password: 'password123',
    role: 'admin'
  });

  const tech = await User.create({
    name: 'Tech User',
    email: 'tech@railready.local',
    password: 'password123',
    role: 'technician'
  });

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@railready.local',
    password: 'password123'
  });
  adminToken = adminLogin.body.token;

  const techLogin = await request(app).post('/api/auth/login').send({
    email: 'tech@railready.local',
    password: 'password123'
  });
  techToken = techLogin.body.token;
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

test('POST /api/auth/login - valid credentials returns JWT token', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@railready.local',
    password: 'password123'
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token);
  assert.equal(res.body.user.role, 'admin');
});

test('POST /api/auth/login - invalid password returns 401', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@railready.local',
    password: 'wrongpassword'
  });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
});

test('GET /api/auth/me - returns authenticated user details', async () => {
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.email, 'admin@railready.local');
});

test('GET /api/users - Admin can list users, Tech gets 403 Forbidden', async () => {
  const adminRes = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(adminRes.statusCode, 200);
  assert.equal(adminRes.body.count, 2);

  const techRes = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${techToken}`);
  assert.equal(techRes.statusCode, 403);
});
