import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Locomotive } from '../models/Locomotive.js';
import { Defect } from '../models/Defect.js';

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27017/railready_test');
  }
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

test('User model hashes password on save and matches correctly', async () => {
  await User.deleteMany({});
  const user = new User({
    name: 'Test Technician',
    email: 'tech.test@railready.local',
    password: 'password123',
    role: 'technician'
  });
  await user.save();

  assert.notEqual(user.password, 'password123');
  const isMatch = await user.matchPassword('password123');
  const isWrong = await user.matchPassword('wrongpass');
  assert.equal(isMatch, true);
  assert.equal(isWrong, false);
});

test('Locomotive model defaults and validation', async () => {
  await Locomotive.deleteMany({});
  const loco = new Locomotive({
    locoNumber: '30999',
    locoClass: 'WAP-7',
    shed: 'Kalyan ELS'
  });
  await loco.save();

  assert.equal(loco.locoNumber, '30999');
  assert.equal(loco.status, 'INSPECTION_PENDING');
  assert.equal(loco.locoClass, 'WAP-7');
});
