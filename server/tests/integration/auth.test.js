/**
 * Integration tests for the Auth API routes.
 * Uses supertest to hit the Express app without starting a real server.
 * 
 * NOTE: These tests require a real MongoDB connection.
 * Set TEST_MONGODB_URI in .env or skip if not available.
 */

// Skip integration tests if no test DB is configured
const SKIP = !process.env.MONGODB_URI;

const conditionalDescribe = SKIP ? describe.skip : describe;

let app;
let mongoose;

beforeAll(async () => {
  if (SKIP) return;
  // Load environment
  const path = require('path');
  require('dotenv').config({ path: path.resolve(__dirname, '../../..', '.env') });
  
  mongoose = require('mongoose');
  app = require('../../app');
  
  // Connect to DB
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

afterAll(async () => {
  if (SKIP) return;
  if (mongoose) await mongoose.disconnect();
});

conditionalDescribe('POST /api/auth/register', () => {
  const request = require('supertest');
  const uniqueEmail = `testuser_${Date.now()}@example.com`;

  test('registers a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: uniqueEmail, password: 'Password123!' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
  });

  test('returns 400 for duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: uniqueEmail, password: 'Password123!' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: uniqueEmail, password: 'Password123!' });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'onlyemail@test.com' });
    expect(res.statusCode).toBe(400);
  });
});

conditionalDescribe('POST /api/auth/login', () => {
  const request = require('supertest');
  const email = `login_test_${Date.now()}@example.com`;
  const password = 'Login@123';

  beforeAll(async () => {
    if (SKIP) return;
    await request(app).post('/api/auth/register').send({
      name: 'Login Test', email, password
    });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword' });
    expect(res.statusCode).toBe(401);
  });

  test('returns 400 or 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@nowhere.com', password: 'test' });
    expect([400, 401]).toContain(res.statusCode);
  });
});

conditionalDescribe('Security — unauthorized access', () => {
  const request = require('supertest');

  test('GET /api/profile returns 401 without token', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/jobs/search returns 401 without token', async () => {
    const res = await request(app).get('/api/jobs/search');
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/agent/run returns 401 without token', async () => {
    const res = await request(app).post('/api/agent/run').send({ goal: 'test' });
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/tools returns 401 without token', async () => {
    const res = await request(app).get('/api/tools');
    expect(res.statusCode).toBe(401);
  });
});

conditionalDescribe('GET /api/health', () => {
  const request = require('supertest');

  test('returns 200 and success:true', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
