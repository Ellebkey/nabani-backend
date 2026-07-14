import request from 'supertest';
import bcrypt from 'bcrypt';
import { Express } from 'express';
import { db } from '@config/sequelize';
import { redisClient } from '@config/redis-config';
import { getApp } from '../helpers/app.helper';
import { cleanDatabase } from '../helpers/db.helper';

let app: Express;

async function createVerifiedUser(overrides: Record<string, unknown> = {}) {
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const username = overrides.username as string || `authuser-${Date.now()}@test.com`;
  const user = await db.User.create({
    username,
    hashedPassword,
    email: overrides.email as string || username,
    emailVerified: true,
    roles: overrides.roles as string[] || ['user'],
  });
  return { user, plainPassword: 'Password123!' };
}

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    app = getApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await redisClient.flushDb();
  });

  // ─── POST /api/auth/register ──────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('When valid data, returns 201 with success message', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser@test.com',
          password: 'Password123!',
          email: 'newuser@test.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('When duplicate username, returns 400', async () => {
      await createVerifiedUser({ username: 'taken@test.com', email: 'taken@test.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'taken@test.com',
          password: 'Password123!',
          email: 'other@test.com',
        });

      // Model-level isUnique validator triggers SequelizeValidationError → 400
      expect(res.status).toBe(400);
    });

    it('When missing required fields, returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'test@test.com' });

      expect(res.status).toBe(400);
    });

    it('When password too short, returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user@test.com',
          password: '12345',
          email: 'user@test.com',
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── POST /api/auth/login ────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('When valid credentials, returns 200 with tokens', async () => {
      const { user } = await createVerifiedUser({ username: 'login@test.com' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: user.username,
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.username).toBe(user.username);
      expect(res.body.roles).toBeDefined();
      expect(res.body.expiresIn).toBeDefined();
    });

    it('When wrong password, returns 422', async () => {
      const { user } = await createVerifiedUser({ username: 'login2@test.com' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: user.username,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(422);
    });

    it('When unknown username, returns 422', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent@test.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(422);
    });

    it('When missing fields, returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });

    it('When email not verified, returns 422', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await db.User.create({
        username: 'unverified@test.com',
        hashedPassword,
        email: 'unverified@test.com',
        emailVerified: false,
        roles: ['user'],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: user.username,
          password: 'Password123!',
        });

      expect(res.status).toBe(422);
    });
  });

  // ─── POST /api/auth/refresh ──────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('When valid refresh token, returns new token pair', async () => {
      const { user } = await createVerifiedUser({ username: 'refresh@test.com' });

      // Login to get tokens
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: 'Password123!' });

      const { refreshToken } = loginRes.body;

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      // Old refresh token should have been rotated
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('When invalid refresh token, returns 422', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token-here' });

      expect(res.status).toBe(422);
    });

    it('When missing refresh token, returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── POST /api/auth/change-password ──────────────────────────────

  describe('POST /api/auth/change-password', () => {
    it('When authenticated with correct current password, returns success', async () => {
      const { user } = await createVerifiedUser({ username: 'change@test.com' });

      // Login first
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: 'Password123!' });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', loginRes.body.token)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('When unauthenticated, returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword456!',
        });

      expect(res.status).toBe(401);
    });

    it('When wrong current password, returns 422', async () => {
      const { user } = await createVerifiedUser({ username: 'change2@test.com' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: 'Password123!' });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', loginRes.body.token)
        .send({
          currentPassword: 'WrongCurrent!',
          newPassword: 'NewPassword456!',
        });

      expect(res.status).toBe(422);
    });
  });

  // ─── POST /api/auth/logout ───────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('When authenticated, logs out and revokes refresh token', async () => {
      const { user } = await createVerifiedUser({ username: 'logout@test.com' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: 'Password123!' });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', loginRes.body.token)
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify refresh token no longer works
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(refreshRes.status).toBe(422);
    });

    it('When unauthenticated with invalid refresh token, still returns 200', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'some-token' });

      expect(res.status).toBe(200);
    });
  });

  // ─── POST /api/auth/reset-password ────────────────────────────────

  describe('POST /api/auth/reset-password', () => {
    it('When email exists, returns success (no info leak)', async () => {
      await createVerifiedUser({ username: 'reset@test.com', email: 'reset@test.com' });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'reset@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('When email does not exist, still returns success (prevents enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'nonexistent@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── POST /api/auth/verify-email ──────────────────────────────────

  describe('POST /api/auth/verify-email', () => {
    it('When invalid token, returns 422', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-verify-token' });

      expect(res.status).toBe(422);
    });
  });

  // ─── Token Flow ───────────────────────────────────────────────────

  describe('Token Flow', () => {
    it('When access token is used on protected endpoint, succeeds', async () => {
      const { user } = await createVerifiedUser({ username: 'flow@test.com' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: 'Password123!' });

      // Use the token on a protected endpoint
      const protectedRes = await request(app)
        .get('/api/dishes')
        .set('Authorization', loginRes.body.token);

      expect(protectedRes.status).not.toBe(401);
    });

    it('When no token on protected endpoint, returns 401', async () => {
      const res = await request(app)
        .get('/api/dishes');

      expect(res.status).toBe(401);
    });

    it('When refresh token rotated, old token no longer works', async () => {
      const { user } = await createVerifiedUser({ username: 'rotate@test.com' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: 'Password123!' });

      const oldRefreshToken = loginRes.body.refreshToken;

      // Refresh to rotate the token
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      // Old refresh token should no longer work
      const retryRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(retryRes.status).toBe(422);
    });
  });
});
