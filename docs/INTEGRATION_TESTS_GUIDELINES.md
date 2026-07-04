# Integration Tests Guide — myexpenses-backend

This document explains how integration tests are structured, how they work, and how to add new ones for any module. It is designed to be self-contained so any developer or LLM can pick it up and replicate the pattern.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Architecture Overview](#2-architecture-overview)
3. [Directory Structure](#3-directory-structure)
4. [How It All Connects](#4-how-it-all-connects)
5. [Jest Configuration](#5-jest-configuration)
6. [Environment Setup](#6-environment-setup)
7. [Test Lifecycle](#7-test-lifecycle)
8. [Helpers In Depth](#8-helpers-in-depth)
9. [Writing a New Integration Test File](#9-writing-a-new-integration-test-file)
10. [Test Naming Convention](#10-test-naming-convention)
11. [What to Test Per Endpoint](#11-what-to-test-per-endpoint)
12. [Authentication in Tests](#12-authentication-in-tests)
13. [Error Response Structure](#13-error-response-structure)
14. [User Isolation Tests](#14-user-isolation-tests)
15. [Running Tests Locally](#15-running-tests-locally)
16. [CI Pipeline](#16-ci-pipeline)
17. [Common Pitfalls](#17-common-pitfalls)
18. [Checklist for New Modules](#18-checklist-for-new-modules)

---

## 1. Philosophy

Integration tests in this project follow the **Component Testing** approach from goldbergyoni's JavaScript testing best practices (section 2.2):

- **Real database** — Tests hit a real PostgreSQL instance (`myexpenses_test`), not mocks.
- **Real middleware chain** — Express middleware (auth, validation, error handling) runs exactly as in production.
- **Real JWT authentication** — Tokens are generated and validated by the real `JWTService`.
- **Real Sequelize models** — All model factories, associations, and constraints are active.
- **Real transactions** — `withTransaction()` utility runs real DB transactions.
- **Only the logger is mocked** — To suppress noisy output during test runs.

This means integration tests catch issues that unit tests cannot: middleware ordering, validation schema registration, Sequelize constraint enforcement, JWT expiration, error middleware normalization, and cross-layer data flow.

---

## 2. Architecture Overview

```
HTTP Request (supertest)
    |
    v
Express App (real — from src/config/express.ts)
    |
    v
Middleware Chain (compression, helmet, cors, body-parser, cookie-parser, HTTP logging)
    |
    v
Auth Middleware (real JWT validation — src/middlewares/auth.ts)
    |
    v
Route Handler (src/routes/*.route.ts)
    |
    v
Controller (validates DTO via Joi, calls service)
    |
    v
Service (business logic, real DB queries via Sequelize)
    |
    v
PostgreSQL (myexpenses_test database — real)
    |
    v
Response flows back through error middleware → supertest assertion
```

Everything in this chain is real except the logger.

---

## 3. Directory Structure

```
src/test/integration/
├── env-setup.ts                          # Loads .env.test before any module imports
├── setup.ts                              # Global beforeAll/afterAll, logger mock
├── helpers/
│   ├── app.helper.ts                     # Cached Express app for supertest
│   ├── auth.helper.ts                    # Creates real User + real JWT token
│   └── db.helper.ts                      # DB init, cleanup (TRUNCATE), close
└── articles/
    └── articles.integration.test.ts      # Article module tests (26 tests)
```

When adding a new module (e.g., expenses), create:
```
src/test/integration/expenses/
    └── expenses.integration.test.ts
```

The helpers and setup files are shared — do NOT duplicate them.

---

## 4. How It All Connects

The execution order when you run `npm run test:integration` is:

```
1. cross-env sets NODE_ENV=test
2. Jest loads jest.integration.config.js
3. setupFiles runs:     src/test/integration/env-setup.ts
   → Loads .env.test into process.env BEFORE any module imports
   → This is critical: config.ts reads env vars at import time
4. setupFilesAfterEnv:  src/test/integration/setup.ts
   → Mocks @config/logger (only mock in integration tests)
   → beforeAll: initTestDatabase() → connects to PostgreSQL, runs sync({ force: true })
   → afterAll: closeTestDatabase() → closes connection pool
5. Test files run sequentially (maxWorkers: 1)
   → Each test file's beforeEach: cleanDatabase() → TRUNCATE all tables CASCADE
   → Each test file's beforeEach: createAuthenticatedUser() → real User row + real JWT
```

**Why `setupFiles` before `setupFilesAfterEnv`?**

`env-setup.ts` must run in `setupFiles` (not `setupFilesAfterEnv`) because `setupFiles` executes before Jest loads any module. This ensures `.env.test` values are in `process.env` before `src/config/config.ts` is imported and validates them. The `dotenv` library does NOT overwrite existing env vars, so loading `.env.test` first guarantees our test values win.

---

## 5. Jest Configuration

**File:** `jest.integration.config.js`

Key differences from the unit test config (`jest.config.js`):

| Setting | Unit Tests | Integration Tests | Why |
|---------|-----------|-------------------|-----|
| `testMatch` | `__tests__/**/*.ts` | `**/test/integration/**/*.integration.test.ts` | Separate file patterns |
| `setupFiles` | (none) | `env-setup.ts` | Loads `.env.test` before modules |
| `setupFilesAfterEnv` | `src/test/unit/setup.ts` | `src/test/integration/setup.ts` | Different lifecycle (real DB vs mocks) |
| `maxWorkers` | default (parallel) | `1` (serial) | Tests share a single DB — parallel would cause race conditions |
| `testTimeout` | default (5s) | `15000` (15s) | DB operations can be slow, especially `sync({ force: true })` |

The unit test config (`jest.config.js`) has `testPathIgnorePatterns: ['/src/test/integration/']` to prevent running integration tests accidentally.

---

## 6. Environment Setup

**File:** `.env.test`

```env
NODE_ENV=test
PORT=4041
JWT_SECRET=test-jwt-secret-for-integration-tests
SQL_HOST=localhost
SQL_DB=myexpenses_test
SQL_USER=postgres
SQL_PASSWORD=password123
SQL_PORT=5432
```

- `SQL_DB=myexpenses_test` — Separate database, never touches development data.
- `SQL_PASSWORD` — Must match YOUR local Postgres password (CI overrides it via
  workflow env vars, which take precedence because dotenv never overwrites
  existing variables).
- `JWT_SECRET` — Fixed value so tokens generated in tests are valid throughout the test run.
- `PORT=4041` — Avoids conflict with the dev server (4040), though supertest doesn't actually bind to a port.

**Docker setup:**

The test database is created by `docker/init-test-db.sh`, mounted in `docker-compose.yml` as an init script. For existing Docker volumes, create it manually:

```bash
docker exec -i $(docker compose ps -q postgres) psql -U postgres \
  -c "CREATE DATABASE myexpenses_test;"
docker exec -i $(docker compose ps -q postgres) psql -U postgres \
  -d myexpenses_test -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
```

---

## 7. Test Lifecycle

### Per test suite (once)

```
beforeAll → initTestDatabase()
  1. new SequelizeDB() — reads config from env vars
  2. sequelizeDB.initDataBase() — creates Sequelize instance, registers all 24 model factories, sets up associations, authenticates connection
  3. db.sequelize.sync({ force: true }) — drops and recreates ALL tables from model definitions
```

### Per test (every `it()`)

```
beforeEach →
  1. cleanDatabase() — TRUNCATE all tables CASCADE (fast, no schema rebuild)
  2. resetUserCounter() — resets the username counter for predictable names
  3. createAuthenticatedUser() — inserts a real User row, generates a real JWT token
```

### After all tests

```
afterAll → closeTestDatabase()
  1. db.sequelize.close() — closes the connection pool cleanly
```

**Why TRUNCATE instead of sync({ force: true }) per test?**

`sync({ force: true })` drops and recreates tables (DDL operations) — slow. `TRUNCATE ... CASCADE` just removes data (DML) — much faster. Tables are only created once in `beforeAll`.

---

## 8. Helpers In Depth

### `app.helper.ts` — Express app singleton

```typescript
import ExpressServer from '@config/express';

let cachedApp: Express.Application | null = null;

export function getApp(): Express.Application {
  if (!cachedApp) {
    cachedApp = new ExpressServer().app;
  }
  return cachedApp;
}
```

- Creates the Express app once, reuses it across all tests.
- `ExpressServer` constructor sets up all middleware and routes.
- `.app` is the raw Express instance — supertest binds to it internally without calling `.listen()`.
- No server port is occupied. Supertest creates an ephemeral connection per request.

### `auth.helper.ts` — Authenticated test users

```typescript
export async function createAuthenticatedUser(overrides?: { username?: string }): Promise<TestUser>
```

- Creates a **real User row** in PostgreSQL (required because articles have a FK to `user.id`).
- Generates a **real JWT token** via `JWTService.generateToken()` using the test `JWT_SECRET`.
- Returns `{ id, username, token }` — use `token` in `.set('Authorization', token)`.
- The `userCounter` + `Date.now()` ensures unique usernames even if `cleanDatabase()` hasn't run yet.
- Call `resetUserCounter()` in `beforeEach` to keep usernames predictable.

**Important:** The token is set directly in the `Authorization` header (no `Bearer ` prefix). This matches the auth middleware in `src/middlewares/auth.ts` which reads `req.headers.authorization` directly.

### `db.helper.ts` — Database lifecycle

Three functions:

| Function | When | What it does |
|----------|------|-------------|
| `initTestDatabase()` | `beforeAll` | Connects to PostgreSQL, registers all models, `sync({ force: true })` |
| `cleanDatabase()` | `beforeEach` | `TRUNCATE TABLE ... CASCADE` on all registered model tables |
| `closeTestDatabase()` | `afterAll` | Closes the Sequelize connection pool |

`cleanDatabase()` dynamically reads table names from the `db` object (all registered Sequelize models), so it automatically covers new models added to `sequelize.ts` without any changes.

---

## 9. Writing a New Integration Test File

The **reference implementation** is the articles module test at:
`src/test/integration/articles/articles.integration.test.ts` (26 tests)

Study that file first. Every new integration test file should follow the same structure. Below is the breakdown of how that file is organized, with the actual code from it.

### 9.1 File header and setup (from articles test)

```typescript
// src/test/integration/articles/articles.integration.test.ts

import request from 'supertest';
import { getApp } from '../helpers/app.helper';
import { createAuthenticatedUser, resetUserCounter } from '../helpers/auth.helper';
import { cleanDatabase } from '../helpers/db.helper';

const app = getApp();

interface TestUser {
  id: string;
  username: string;
  token: string;
}

let testUser: TestUser;

beforeEach(async () => {
  await cleanDatabase();
  resetUserCounter();
  testUser = await createAuthenticatedUser();
});
```

This pattern is **identical** for every module. The only thing that changes is the test content inside `describe()`.

### 9.2 Test organization (from articles test)

The articles test file organizes tests in this order:

```
describe('Articles API - /api/articles')
  ├── describe('Authentication')              → 2 tests (no token, invalid token)
  ├── describe('POST /api/articles')          → 5 tests (happy path, defaults, validation, constraint)
  ├── describe('GET /api/articles')           → 5 tests (empty, enabled-only, fetchAll, search, pagination)
  ├── describe('GET /api/articles/:id')       → 3 tests (found, not found, invalid id)
  ├── describe('PUT /api/articles/:id')       → 3 tests (update, not found, empty body)
  ├── describe('DELETE /api/articles/:id')    → 2 tests (delete + verify, not found)
  ├── describe('PUT /api/articles (disable)') → 2 tests (batch disable, partial IDs)
  └── describe('User Isolation')              → 4 tests (list, get, update, delete isolation)
```

Follow this same grouping for new modules: **Auth → Create → List → GetById → Update → Delete → Batch ops → User Isolation**.

### 9.3 How the articles test creates data (per-test, no shared fixtures)

Every test creates its own data via API calls. No global seeds, no shared state. From the articles test:

```typescript
// POST test — creates via API, then verifies via GET
it('When valid data with all fields is provided, should create article and persist in DB', async () => {
  const payload = {
    concept: 'Milk 1L',
    barcode: '1234567890123',
    brand: 'Brand A',
  };

  const res = await request(app)
    .post('/api/articles')
    .set('Authorization', testUser.token)
    .send(payload);

  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({
    concept: 'Milk 1L',
    barcode: '1234567890123',
    brand: 'Brand A',
    isEnabled: true,
  });
  expect(res.body.id).toBeDefined();

  // Verify DB state
  const dbCheck = await request(app)
    .get(`/api/articles/${res.body.id}`)
    .set('Authorization', testUser.token);

  expect(dbCheck.status).toBe(200);
  expect(dbCheck.body.concept).toBe('Milk 1L');
});
```

Notice: data is created inline, response is asserted, then a follow-up GET verifies the DB state. Replicate this pattern for every create/update/delete test.

### 9.4 How the articles test handles enabled/disabled filtering

Some tests need to set up prerequisite state. The articles test does this by chaining API calls:

```typescript
it('When articles exist, should return only enabled articles by default', async () => {
  // Create enabled and disabled articles
  await request(app)
    .post('/api/articles')
    .set('Authorization', testUser.token)
    .send({ concept: 'Enabled Item' });

  const disabledRes = await request(app)
    .post('/api/articles')
    .set('Authorization', testUser.token)
    .send({ concept: 'Disabled Item' });

  // Disable the second article
  await request(app)
    .put(`/api/articles/${disabledRes.body.id}`)
    .set('Authorization', testUser.token)
    .send({ isEnabled: false });

  const res = await request(app)
    .get('/api/articles')
    .set('Authorization', testUser.token);

  expect(res.status).toBe(200);
  expect(res.body.count).toBe(1);
  expect(res.body.rows[0].concept).toBe('Enabled Item');
});
```

### 9.5 Adapting for a new module

When creating tests for a new module (e.g., recipients), follow these steps:

1. **Copy the structure** from the articles test, not the template.
2. **Replace the endpoint** (`/api/articles` → `/api/recipients`).
3. **Replace the payload** with the new module's DTO fields.
4. **Adjust assertions** to match the new module's response shape.
5. **Handle FK dependencies** — if your module needs parent records:

```typescript
// Example: expenses need a recipient and payment method
// Create them in beforeEach or at the start of the test
import { db } from '@config/sequelize';

let testRecipient: { id: number };
let testPaymentMethod: { id: number };

beforeEach(async () => {
  await cleanDatabase();
  resetUserCounter();
  testUser = await createAuthenticatedUser();

  // Create FK dependencies directly in DB
  testRecipient = await db.Recipient.create({
    name: 'Test Store',
    userId: testUser.id,
  });
  testPaymentMethod = await db.PaymentMethod.create({
    name: 'Cash',
    userId: testUser.id,
  });
});
```

**File naming:** `src/test/integration/<module>/<module>.integration.test.ts`

---

## 10. Test Naming Convention

Every test follows the **3-part naming** pattern. The `describe` provides the "what", and `it` provides the "when" + "should".

Here are all 26 test names from the articles integration test as reference:

```
describe('Articles API - /api/articles')

  describe('Authentication')
    ✓ When no token is provided, should return 401
    ✓ When an invalid token is provided, should return 401

  describe('POST /api/articles')
    ✓ When valid data with all fields is provided, should create article and persist in DB
    ✓ When only required fields are provided, should create article with defaults
    ✓ When concept is missing, should return 400 validation error
    ✓ When concept exceeds max length, should return 400 validation error
    ✓ When a duplicate barcode is used, should return 409 conflict

  describe('GET /api/articles')
    ✓ When no articles exist, should return empty list with count 0
    ✓ When articles exist, should return only enabled articles by default
    ✓ When fetchAll=true, should return both enabled and disabled articles
    ✓ When searchText is provided, should filter articles by concept or brand
    ✓ When pagination params are provided, should respect offset and limit

  describe('GET /api/articles/:id')
    ✓ When article exists, should return the article
    ✓ When article does not exist, should return 404
    ✓ When id is not a valid number, should return 400

  describe('PUT /api/articles/:id')
    ✓ When valid update data is provided, should update and persist changes
    ✓ When article does not exist, should return 404
    ✓ When body is empty, should return 400

  describe('DELETE /api/articles/:id')
    ✓ When article exists, should delete and return 204
    ✓ When article does not exist, should return 404

  describe('PUT /api/articles (disable multiple)')
    ✓ When valid article IDs are provided, should disable all and verify DB state
    ✓ When some article IDs do not exist, should return 404

  describe('User Isolation')
    ✓ When User A creates articles, User B should not see them
    ✓ When User B tries to get User A article by ID, should return 404
    ✓ When User B tries to update User A article, should return 404
    ✓ When User B tries to delete User A article, should return 404
```

Use this exact naming style for new modules. The `describe` is the endpoint, the `it` starts with "When" and includes "should".

---

## 11. What to Test Per Endpoint

For each CRUD endpoint, cover the categories below. Each one includes the actual test from the articles module as reference.

### Create (POST)

From `articles.integration.test.ts`:

| Test scenario | Articles example | Assert |
|---------------|-----------------|--------|
| Happy path (all fields) | `send({ concept: 'Milk 1L', barcode: '1234567890123', brand: 'Brand A' })` | 201 + `toMatchObject` + verify via GET |
| Required-only fields | `send({ concept: 'Eggs' })` | 201 + defaults applied (`isEnabled: true`, `barcode: null`) |
| Missing required field | `send({ barcode: '111' })` (no concept) | 400 `VALIDATION_ERROR` |
| Field exceeds max length | `send({ concept: 'A'.repeat(256) })` | 400 `VALIDATION_ERROR` |
| Unique constraint | Two POSTs with `barcode: 'DUPLICATE-123'` | 409 `CONFLICT` |

**Key pattern — verify DB state after create:**
```typescript
// From articles test: POST then GET to verify persistence
const res = await request(app)
  .post('/api/articles')
  .set('Authorization', testUser.token)
  .send(payload);

expect(res.status).toBe(201);

const dbCheck = await request(app)
  .get(`/api/articles/${res.body.id}`)
  .set('Authorization', testUser.token);

expect(dbCheck.status).toBe(200);
expect(dbCheck.body.concept).toBe('Milk 1L');
```

### Read List (GET)

From `articles.integration.test.ts`:

| Test scenario | Articles example | Assert |
|---------------|-----------------|--------|
| Empty result | GET with no data created | `{ rows: [], count: 0 }` |
| Default filter | Create enabled + disabled articles | Only enabled returned |
| Explicit filter | `.query({ fetchAll: true })` | Both enabled and disabled returned |
| Search filter | `.query({ searchText: 'milk' })` | Only matching articles |
| Pagination | `.query({ offset: 0, limit: 2 })` with 3 articles | `rows.length === 2`, `count === 3` |

**Key pattern — search filtering:**
```typescript
// From articles test: create 2 articles, search for one
await request(app).post('/api/articles')
  .set('Authorization', testUser.token)
  .send({ concept: 'Organic Milk', brand: 'FarmFresh' });

await request(app).post('/api/articles')
  .set('Authorization', testUser.token)
  .send({ concept: 'Bread', brand: 'BakeryPlus' });

const res = await request(app)
  .get('/api/articles')
  .query({ searchText: 'milk' })
  .set('Authorization', testUser.token);

expect(res.body.count).toBe(1);
expect(res.body.rows[0].concept).toBe('Organic Milk');
```

### Read by ID (GET /:id)

From `articles.integration.test.ts`:

| Test scenario | Articles example | Assert |
|---------------|-----------------|--------|
| Exists | Create then GET by returned ID | 200 + correct body |
| Not found | `GET /api/articles/99999` | 404 `NOT_FOUND` |
| Invalid ID | `GET /api/articles/invalid` | 400 `VALIDATION_ERROR` |

### Update (PUT /:id)

From `articles.integration.test.ts`:

| Test scenario | Articles example | Assert |
|---------------|-----------------|--------|
| Happy path | Create, then PUT `{ concept: 'Updated' }` | 200 + verify via GET |
| Not found | `PUT /api/articles/99999` | 404 `NOT_FOUND` |
| Empty body | PUT with `{}` | 400 `VALIDATION_ERROR` |

**Key pattern — update then verify persistence:**
```typescript
// From articles test: PUT then GET to confirm DB change
const created = await request(app)
  .post('/api/articles')
  .set('Authorization', testUser.token)
  .send({ concept: 'Original' });

const res = await request(app)
  .put(`/api/articles/${created.body.id}`)
  .set('Authorization', testUser.token)
  .send({ concept: 'Updated' });

expect(res.status).toBe(200);
expect(res.body.concept).toBe('Updated');

// Verify DB state
const dbCheck = await request(app)
  .get(`/api/articles/${created.body.id}`)
  .set('Authorization', testUser.token);

expect(dbCheck.body.concept).toBe('Updated');
```

### Delete (DELETE /:id)

From `articles.integration.test.ts`:

| Test scenario | Articles example | Assert |
|---------------|-----------------|--------|
| Exists | Create, DELETE, then GET | 204 + subsequent GET returns 404 |
| Not found | `DELETE /api/articles/99999` | 404 `NOT_FOUND` |

**Key pattern — delete then verify removal:**
```typescript
// From articles test: DELETE then GET to confirm gone
const created = await request(app)
  .post('/api/articles')
  .set('Authorization', testUser.token)
  .send({ concept: 'To Delete' });

const res = await request(app)
  .delete(`/api/articles/${created.body.id}`)
  .set('Authorization', testUser.token);

expect(res.status).toBe(204);

// Verify removal from DB
const dbCheck = await request(app)
  .get(`/api/articles/${created.body.id}`)
  .set('Authorization', testUser.token);

expect(dbCheck.status).toBe(404);
```

### Batch operations

From `articles.integration.test.ts` (disable multiple):

| Test scenario | Articles example | Assert |
|---------------|-----------------|--------|
| Happy path | PUT with `{ articles: [{ id: 1 }, { id: 2 }] }` | 200 + message + verify via GET list |
| Partial invalid IDs | PUT with one valid + one invalid ID | 404 `NOT_FOUND` |

**Key pattern — batch then verify state change:**
```typescript
// From articles test: disable 2 articles, verify they don't appear in default list
const res = await request(app)
  .put('/api/articles')
  .set('Authorization', testUser.token)
  .send({
    articles: [
      { id: art1.body.id },
      { id: art2.body.id },
    ],
  });

expect(res.status).toBe(200);
expect(res.body.message).toContain('2 articles disabled');

const listRes = await request(app)
  .get('/api/articles')
  .set('Authorization', testUser.token);

expect(listRes.body.count).toBe(0);
```

### User Isolation (always include)

See [Section 14](#14-user-isolation-tests) for the full pattern from the articles test.

---

## 12. Authentication in Tests

The auth middleware (`src/middlewares/auth.ts`) reads the token directly from `req.headers.authorization` — **no `Bearer` prefix**.

```typescript
// CORRECT
.set('Authorization', testUser.token)

// WRONG — will fail with 401
.set('Authorization', `Bearer ${testUser.token}`)
```

Every module test file should include the same 2 auth tests. From `articles.integration.test.ts`:

```typescript
describe('Authentication', () => {
  it('When no token is provided, should return 401', async () => {
    const res = await request(app)
      .get('/api/articles');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('When an invalid token is provided, should return 401', async () => {
    const res = await request(app)
      .get('/api/articles')
      .set('Authorization', 'invalid-token-value');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
```

For new modules, copy this block and change `/api/articles` to your module's endpoint.

---

## 13. Error Response Structure

All errors from the API follow this shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "status": 400,
    "details": { ... }  // optional, present on validation errors
  }
}
```

Error codes used in assertions:

| Code | HTTP Status | When |
|------|-------------|------|
| `UNAUTHORIZED` | 401 | Missing or invalid auth token (frontend triggers token refresh) |
| `FORBIDDEN` | 403 | Authenticated but not allowed (e.g. missing role) |
| `BUSINESS_RULE_VIOLATION` | 422 | Business logic error |
| `VALIDATION_ERROR` | 400 | Joi validation failed, Sequelize validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Unique constraint violation (e.g., duplicate barcode) |
| `ROUTE_NOT_FOUND` | 404 | Endpoint does not exist |

Assert pattern:
```typescript
expect(res.status).toBe(400);
expect(res.body.error.code).toBe('VALIDATION_ERROR');
```

---

## 14. User Isolation Tests

Every module that stores user-scoped data (using `userId` FK) MUST include user isolation tests. This verifies that the `where: { userId }` clause is consistently applied across all service methods.

The articles test covers 4 isolation scenarios. Here is the actual code from `articles.integration.test.ts`:

```typescript
describe('User Isolation', () => {
  let userB: TestUser;

  beforeEach(async () => {
    userB = await createAuthenticatedUser({ username: 'user-b' });
  });

  it('When User A creates articles, User B should not see them', async () => {
    await request(app)
      .post('/api/articles')
      .set('Authorization', testUser.token)
      .send({ concept: 'User A Article' });

    const res = await request(app)
      .get('/api/articles')
      .set('Authorization', userB.token);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it('When User B tries to get User A article by ID, should return 404', async () => {
    const created = await request(app)
      .post('/api/articles')
      .set('Authorization', testUser.token)
      .send({ concept: 'Private Article' });

    const res = await request(app)
      .get(`/api/articles/${created.body.id}`)
      .set('Authorization', userB.token);

    expect(res.status).toBe(404);
  });

  it('When User B tries to update User A article, should return 404', async () => {
    const created = await request(app)
      .post('/api/articles')
      .set('Authorization', testUser.token)
      .send({ concept: 'Not Yours' });

    const res = await request(app)
      .put(`/api/articles/${created.body.id}`)
      .set('Authorization', userB.token)
      .send({ concept: 'Stolen' });

    expect(res.status).toBe(404);
  });

  it('When User B tries to delete User A article, should return 404', async () => {
    const created = await request(app)
      .post('/api/articles')
      .set('Authorization', testUser.token)
      .send({ concept: 'Protected' });

    const res = await request(app)
      .delete(`/api/articles/${created.body.id}`)
      .set('Authorization', userB.token);

    expect(res.status).toBe(404);
  });
});
```

For new modules, replicate these same 4 tests (list, get by id, update, delete) — just change the endpoint and payload. The pattern is always:
1. `testUser` (User A) creates a resource
2. `userB` (User B) tries to access it
3. Assert 404 or empty list

---

## 15. Running Tests Locally

### Prerequisites
1. PostgreSQL AND Redis running (the integration setup connects to Redis in
   `beforeAll` and closes it in `afterAll`): `docker compose up -d`, or local
   services on ports 5432/6379
2. Test database exists (first time only):
   ```bash
   docker exec -i $(docker compose ps -q postgres) psql -U postgres \
     -c "CREATE DATABASE myexpenses_test;"
   docker exec -i $(docker compose ps -q postgres) psql -U postgres \
     -d myexpenses_test -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
   ```

### Commands
```bash
npm run test:unit          # 600+ unit tests (mocked, fast)
npm run test:integration   # 250+ integration tests (real DB)
npm run test:all           # both suites sequentially
```

### Run a specific integration test file
```bash
npx cross-env NODE_ENV=test jest --config jest.integration.config.js --runInBand \
  --testPathPatterns="articles"
```

---

## 16. CI Pipeline

**File:** `.github/workflows/ci.yml`

The CI runs on **pull requests to master** with two parallel jobs:

```
PR opened/updated
    ├── Job: Unit Tests        (no DB, fast)
    └── Job: Integration Tests (PostgreSQL service container)
```

Both jobs must pass before merging. On merge to master, the existing Deploy workflow (`main.yml`) runs separately.

The integration job:
1. Starts a `postgres:16-alpine` service container with `myexpenses_test` DB
2. Waits for health check (`pg_isready`)
3. Installs the `uuid-ossp` extension
4. Runs `npm run test:integration`

Environment variables are set at the job level, matching `.env.test`.

---

## 17. Common Pitfalls

### "Config validation error: NODE_ENV must be one of..."
The `src/config/config.ts` Joi schema must include `'test'` in the valid values for `NODE_ENV`. This was already fixed.

### "Cannot find module ./routes/article.route.js"
The `src/index.route.ts` must use `.ts` extension when `NODE_ENV === 'test'`. This was already fixed.

### "relation 'user' does not exist"
The test database doesn't have the `uuid-ossp` extension. Run:
```bash
docker exec -i $(docker compose ps -q postgres) psql -U postgres \
  -d myexpenses_test -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
```

### Tests interfere with each other / flaky results
- Ensure `cleanDatabase()` runs in `beforeEach`, not `beforeAll`.
- Ensure `maxWorkers: 1` in the integration config — tests share a DB.
- Never rely on auto-increment IDs being specific values — they persist across TRUNCATEs.

### "ECONNREFUSED 127.0.0.1:5432"
Docker PostgreSQL is not running. Start it: `docker compose up -d`

### Tests pass locally but fail in CI
- Check that the CI job has the `uuid-ossp` extension creation step.
- Check that env vars in `ci.yml` match `.env.test`.
- Check that the PostgreSQL service container health check passes before tests run.

### Token authentication fails with 401 in tests
Do NOT use `Bearer` prefix. The auth middleware reads `req.headers.authorization` directly:
```typescript
// Correct:
.set('Authorization', testUser.token)
```

### Foreign key constraint errors when creating test data
If your module has FKs to other tables (e.g., `expense` requires `recipient_id` and `payment_method_id`), create those dependencies first — either via their API or directly via `db.Model.create()`.

---

## 18. Checklist for New Modules

When adding integration tests for a new module, follow this checklist. Use `src/test/integration/articles/articles.integration.test.ts` as your reference implementation for every step.

- [ ] **Create the test file** at `src/test/integration/<module>/<module>.integration.test.ts`
- [ ] **Copy the file header** from the articles test (imports, `getApp()`, `TestUser` interface, `beforeEach` with `cleanDatabase` → `resetUserCounter` → `createAuthenticatedUser`)
- [ ] **Add Authentication tests** — copy the 2 auth tests from the articles test, change the endpoint
- [ ] **Add Create (POST) tests** — follow the articles pattern: happy path with all fields, required-only, missing required field, max length, unique constraint
- [ ] **Add List (GET) tests** — follow the articles pattern: empty list, default filter, explicit filter, search, pagination
- [ ] **Add Get by ID tests** — follow the articles pattern: found, not found (99999), invalid ID format
- [ ] **Add Update (PUT) tests** — follow the articles pattern: happy path + verify via GET, not found, empty body
- [ ] **Add Delete tests** — follow the articles pattern: delete + verify via GET returns 404, not found
- [ ] **Add batch operation tests** (if applicable) — follow the articles disable multiple pattern
- [ ] **Add User Isolation tests** — copy the 4 isolation tests from articles, change endpoint and payload
- [ ] **Verify DB state** after every POST/PUT/DELETE with a follow-up GET request (see articles test for the pattern)
- [ ] **Handle FK dependencies** — if the module has FKs, create parent records in `beforeEach` (see [Section 9.5](#95-adapting-for-a-new-module))
- [ ] **Test names** follow `When <scenario>, should <result>` — see [Section 10](#10-test-naming-convention) for the full list from articles
- [ ] **No new mocks** — only the logger is mocked (in `setup.ts`), everything else is real
- [ ] **Run `npm run test:all`** to ensure both unit and integration tests pass

