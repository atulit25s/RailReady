import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server.js';
import { User } from '../models/User.js';
import { Locomotive } from '../models/Locomotive.js';
import { Defect } from '../models/Defect.js';
import { TrainService } from '../models/TrainService.js';
import { Inspection } from '../models/Inspection.js';

let managerToken;
let readyLocoId;
let unreadyLocoId;
let serviceId;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/railready_test');
  }
  await User.deleteMany({});
  await Locomotive.deleteMany({});
  await Defect.deleteMany({});
  await TrainService.deleteMany({});
  await Inspection.deleteMany({});

  const manager = await User.create({
    name: 'Shed Head',
    email: 'manager.dep@railready.local',
    password: 'password123',
    role: 'manager'
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'manager.dep@railready.local',
    password: 'password123'
  });
  managerToken = loginRes.body.token;

  // 1. Ready Locomotive with Approved inspection & 0 defects
  const readyLoco = await Locomotive.create({
    locoNumber: '30200',
    locoClass: 'WAP-7',
    status: 'READY'
  });
  readyLocoId = readyLoco._id;

  await Inspection.create({
    inspectionNumber: 'INS-TEST-READY',
    locomotive: readyLocoId,
    inspector: manager._id,
    supervisor: manager._id,
    status: 'APPROVED',
    items: []
  });

  // 2. Unready Locomotive with critical defect
  const unreadyLoco = await Locomotive.create({
    locoNumber: '30299',
    locoClass: 'WAG-9',
    status: 'UNDER_MAINTENANCE'
  });
  unreadyLocoId = unreadyLoco._id;

  await Defect.create({
    defectNumber: 'DEF-CRIT-99',
    locomotive: unreadyLocoId,
    category: 'Brake',
    severity: 'CRITICAL',
    description: 'Brake pipe rupture',
    reportedBy: manager._id,
    status: 'OPEN'
  });

  // Train Service
  const service = await TrainService.create({
    serviceNumber: '12127',
    serviceName: 'Mumbai-Pune Intercity',
    origin: 'CSMT Mumbai',
    destination: 'Pune Junction',
    scheduledDeparture: '06:40',
    scheduledArrival: '09:57'
  });
  serviceId = service._id;
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

test('GET /api/readiness/:id - evaluates readiness with exact blockers', async () => {
  const res = await request(app)
    .get(`/api/readiness/${unreadyLocoId}`)
    .set('Authorization', `Bearer ${managerToken}`);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.isReadyForDeployment, false);
  assert.equal(res.body.data.calculatedStatus, 'UNDER_MAINTENANCE');
  assert.ok(res.body.data.blockers.length >= 1);
});

test('POST /api/deployments - blocks deployment for unready locomotive', async () => {
  const res = await request(app)
    .post('/api/deployments')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      locomotiveId: unreadyLocoId,
      trainServiceId: serviceId
    });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.error, /Deployment blocked/);
  assert.ok(res.body.blockers.length >= 1);
});

test('POST /api/deployments - successfully assigns ready locomotive', async () => {
  const res = await request(app)
    .post('/api/deployments')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      locomotiveId: readyLocoId,
      trainServiceId: serviceId
    });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, 'CONFIRMED');
});
