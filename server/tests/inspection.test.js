import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server.js';
import { User } from '../models/User.js';
import { Locomotive } from '../models/Locomotive.js';
import { Inspection } from '../models/Inspection.js';
import { Defect } from '../models/Defect.js';

let supervisorToken;
let techToken;
let locoId;
let createdInspectionId;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/railready_test');
  }
  await User.deleteMany({});
  await Locomotive.deleteMany({});
  await Inspection.deleteMany({});
  await Defect.deleteMany({});

  const sup = await User.create({
    name: 'Shed Supervisor',
    email: 'sup.inspect@railready.local',
    password: 'password123',
    role: 'supervisor'
  });

  const tech = await User.create({
    name: 'Inspection Tech',
    email: 'tech.inspect@railready.local',
    password: 'password123',
    role: 'technician'
  });

  const loco = await Locomotive.create({
    locoNumber: '30187',
    locoClass: 'WAP-7',
    shed: 'Kalyan ELS'
  });
  locoId = loco._id;

  const supRes = await request(app).post('/api/auth/login').send({
    email: 'sup.inspect@railready.local',
    password: 'password123'
  });
  supervisorToken = supRes.body.token;

  const techRes = await request(app).post('/api/auth/login').send({
    email: 'tech.inspect@railready.local',
    password: 'password123'
  });
  techToken = techRes.body.token;
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

test('GET /api/inspection-templates/default - loads default checklist', async () => {
  const res = await request(app)
    .get('/api/inspection-templates/default')
    .set('Authorization', `Bearer ${techToken}`);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.items.length >= 20);
});

test('POST /api/inspections - Supervisor schedules new digital inspection', async () => {
  const res = await request(app)
    .post('/api/inspections')
    .set('Authorization', `Bearer ${supervisorToken}`)
    .send({
      locomotiveId: locoId,
      notes: 'Pre-departure mandatory inspection'
    });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.status, 'PENDING');
  assert.ok(res.body.data.items.length >= 20);
  createdInspectionId = res.body.data._id;
});

test('POST /api/inspections/:id/submit - Submits inspection and auto-creates defect on FAIL', async () => {
  const inspection = await Inspection.findById(createdInspectionId);
  const updatedItems = inspection.items.map((it, idx) => {
    if (idx === 0) {
      return {
        category: it.category,
        itemTitle: it.itemTitle,
        result: 'FAIL',
        comment: 'Air pressure dropping rapidly below 4.5 bar'
      };
    }
    return {
      category: it.category,
      itemTitle: it.itemTitle,
      result: 'PASS',
      comment: 'Inspected OK'
    };
  });

  const res = await request(app)
    .post(`/api/inspections/${createdInspectionId}/submit`)
    .set('Authorization', `Bearer ${techToken}`)
    .send({
      items: updatedItems,
      submissionNotes: 'Completed with 1 brake defect found'
    });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.status, 'SUBMITTED');
  assert.equal(res.body.defectsCreated, 1);

  const defects = await Defect.find({ inspection: createdInspectionId });
  assert.equal(defects.length, 1);
  assert.equal(defects[0].severity, 'HIGH');
});

test('PATCH /api/inspections/:id/review - Supervisor approves inspection', async () => {
  const res = await request(app)
    .patch(`/api/inspections/${createdInspectionId}/review`)
    .set('Authorization', `Bearer ${supervisorToken}`)
    .send({
      action: 'APPROVE',
      supervisorFeedback: 'Defect logged to maintenance team. Inspection approved.'
    });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.status, 'APPROVED');
});
