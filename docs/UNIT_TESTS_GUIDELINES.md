# Unit Tests Guide — myexpenses-backend

This document explains how unit tests are structured, how they work, and how to add new ones for any module. It is designed to be self-contained so any developer or LLM can pick it up and replicate the pattern.

The **reference implementation** is the articles module:
- **Service test:** `src/services/__tests__/article.service.test.ts` (21 tests)
- **Controller test:** `src/controllers/__tests__/article.controller.test.ts` (16 tests)

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Unit vs Integration — What Each Covers](#2-unit-vs-integration--what-each-covers)
3. [Directory Structure](#3-directory-structure)
4. [Mock Architecture](#4-mock-architecture)
5. [Jest Configuration](#5-jest-configuration)
6. [Global Test Setup](#6-global-test-setup)
7. [Factories](#7-factories)
8. [Writing Service Tests](#8-writing-service-tests)
9. [Writing Controller Tests](#9-writing-controller-tests)
10. [Test Naming Convention](#10-test-naming-convention)
11. [What to Test Per Layer](#11-what-to-test-per-layer)
12. [Mocking Patterns](#12-mocking-patterns)
13. [Error Testing Patterns](#13-error-testing-patterns)
14. [Rules to Avoid Anti-Patterns](#14-rules-to-avoid-anti-patterns)
15. [Running Tests](#15-running-tests)
16. [Adding Tests for a New Module](#16-adding-tests-for-a-new-module)
17. [Checklist for New Modules](#17-checklist-for-new-modules)

---

## 1. Philosophy

Unit tests in this project follow goldbergyoni's JavaScript testing best practices:

- **Everything is mocked** — DB, services, utilities, logger. Tests run in pure isolation.
- **Black-box approach** — Assert on outputs and errors, not on internal query structure.
- **Each test owns its data** — Factories produce realistic data, overrides customize per test.
- **Test behavior, not implementation** — "When X happens, the result should be Y."
- **Two test files per module** — One for the service layer, one for the controller layer.

Unit tests are fast (sub-second), require no infrastructure, and verify that each layer handles its inputs/outputs and errors correctly in isolation.

---

## 2. Unit vs Integration — What Each Covers

| Concern | Unit tests | Integration tests |
|---------|-----------|-------------------|
| Database | Mocked (`db.mock.ts`) | Real PostgreSQL |
| Service methods | Tested with mocked DB calls | Exercised through real HTTP |
| Controller methods | Tested with mocked service | Exercised through real HTTP |
| Express middleware | Not tested | Real middleware chain |
| Joi validation | Mocked (`validation.util` mock) | Real validation |
| JWT auth | Not tested | Real token generation/verification |
| Transactions | Mocked (passthrough) | Real DB transactions |
| Error classes | Tested (throw + catch) | Tested via HTTP status codes |

Unit tests answer: **"Does this function handle its inputs and errors correctly?"**
Integration tests answer: **"Does the full stack work end-to-end?"**

---

## 3. Directory Structure

```
src/
├── services/
│   └── __tests__/
│       └── article.service.test.ts           # Service unit tests (21 tests)
├── controllers/
│   └── __tests__/
│       └── article.controller.test.ts        # Controller unit tests (16 tests)
├── test/
│   ├── unit/
│   │   ├── setup.ts                          # Global test setup (clearAllMocks, console suppression)
│   │   └── mocks/
│   │       ├── db.mock.ts                    # Sequelize DB mock
│   │       ├── logger.mock.ts                # Logger mock (shared)
│   │       ├── article.service.mock.ts       # Service mock for controller tests
│   │       ├── transaction.util.mock.ts      # Transaction passthrough mock
│   │       ├── validation.util.mock.ts       # Validation passthrough mock
│   │       └── user-context.util.mock.ts     # User context passthrough mock
│   └── factories/
│       └── article.factory.ts                # Test data factories
```

All mocks live under `src/test/unit/mocks/` — no scattered `__mocks__` directories next to source code. Each mock file uses a `.mock.ts` suffix for clarity.

When adding a new module (e.g., recipients), create:
```
src/test/unit/mocks/recipient.service.mock.ts   # Service mock for controller tests
src/services/__tests__/recipient.service.test.ts
src/controllers/__tests__/recipient.controller.test.ts
src/test/factories/recipient.factory.ts
```

Update `src/test/unit/mocks/db.mock.ts` to add the new model's mock methods.

---

## 4. Mock Architecture

Unit tests use a layered mocking strategy. Each layer mocks its direct dependencies only.

### Service tests mock:
```
┌─────────────────────────────────┐
│  ArticleService (REAL)          │  ← The code under test
├─────────────────────────────────┤
│  db.Article (MOCKED)            │  ← src/test/unit/mocks/db.mock.ts
│  db.ArticleRecord (MOCKED)      │
│  db.ExpenseItem (MOCKED)        │
│  withTransaction (MOCKED)       │  ← src/test/unit/mocks/transaction.util.mock.ts
│  logger (MOCKED)                │  ← src/test/unit/mocks/logger.mock.ts
└─────────────────────────────────┘
```

### Controller tests mock:
```
┌─────────────────────────────────┐
│  ArticleController (REAL)       │  ← The code under test
├─────────────────────────────────┤
│  ArticleService (MOCKED)        │  ← src/test/unit/mocks/article.service.mock.ts
│  validateDto (MOCKED)           │  ← src/test/unit/mocks/validation.util.mock.ts
│  requireUserId (MOCKED)         │  ← src/test/unit/mocks/user-context.util.mock.ts
│  logger (MOCKED)                │  ← src/test/unit/mocks/logger.mock.ts
│  req / res / next (MOCKED)      │  ← Created inline per test file
└─────────────────────────────────┘
```

**Key principle:** The service test verifies service logic with mocked DB. The controller test verifies controller logic with mocked service. Neither tests the other's concerns.

---

## 5. Jest Configuration

**File:** `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    // ... all path aliases from tsconfig
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/unit/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/src/test/integration/'],
};
```

Key points:
- `moduleNameMapper` mirrors `tsconfig.json` path aliases so `@config/`, `@services/`, etc. resolve correctly.
- `setupFilesAfterEnv` runs `setup.ts` after Jest's test framework loads (so `jest.fn()` is available).
- `testPathIgnorePatterns` excludes integration tests from unit test runs.
- Mocks use explicit `jest.mock()` with `require()` paths pointing to `src/test/unit/mocks/` — no `__mocks__` directories next to source code.

---

## 6. Global Test Setup

**File:** `src/test/unit/setup.ts`

```typescript
jest.mock('@config/logger', () => require('./mocks/logger.mock'));

if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});
```

What this does:
- **Mocks the logger globally** — prevents noisy log output in all tests, uses `src/test/unit/mocks/logger.mock.ts`.
- **Suppresses `console.log/info/debug`** — keeps test output clean. `console.error` and `console.warn` are NOT suppressed so real errors are still visible during debugging.
- **`clearAllMocks` after each test** — resets `mock.calls`, `mock.instances`, and `mock.results` so tests don't leak state. Does NOT remove mock implementations.
- **`restoreAllMocks` after all tests** — restores original implementations when the suite finishes.

---

## 7. Factories

**File:** `src/test/factories/article.factory.ts`

Factories create realistic test data with sensible defaults. Each factory accepts an `overrides` parameter to customize specific fields per test.

### Reference: articles factory

```typescript
const BASE_DATE = new Date('2024-01-15T10:00:00Z');
const TEST_USER_ID = 'user-uuid-123';

// Input DTOs (what the controller/service receives)
export function makeCreateArticleDto(overrides: Partial<CreateArticleDto> = {}): CreateArticleDto {
  return {
    concept: 'Leche entera 1L',
    brand: 'Lala',
    barcode: '7501000000001',
    isEnabled: true,
    ...overrides,
  };
}

export function makeUpdateArticleDto(overrides: Partial<UpdateArticleDto> = {}): UpdateArticleDto {
  return {
    concept: 'Leche entera 2L',
    ...overrides,
  };
}

export function makeArticleFilterDto(overrides: Partial<ArticleFilterDto> = {}): ArticleFilterDto {
  return {
    offset: 0,
    limit: 50,
    fetchAll: false,
    ...overrides,
  };
}

// Sequelize model instance (what the DB returns)
export function makeArticleInstance(
  overrides: Partial<ArticleInstance & { records?: ArticleRecordInstance[] }> = {},
): ArticleInstance {
  return {
    id: 1,
    concept: 'Leche entera 1L',
    brand: 'Lala',
    barcode: '7501000000001',
    details: null,
    packaging: null,
    isEnabled: true,
    userId: TEST_USER_ID,
    showDetail: false,
    ExpenseItem: undefined,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  } as unknown as ArticleInstance;
}

// Output DTO (what the service returns to the controller)
export function makeArticleDto(overrides: Partial<ArticleDto> = {}): ArticleDto {
  return {
    id: 1,
    concept: 'Leche entera 1L',
    brand: 'Lala',
    barcode: '7501000000001',
    details: null,
    packaging: null,
    isEnabled: true,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    records: undefined,
    ...overrides,
  };
}

// Associated model instance
export function makeArticleRecordInstance(overrides: Partial<ArticleRecordInstance> = {}): ArticleRecordInstance {
  return {
    id: 1,
    articleId: 1,
    expenseId: 100,
    price: 25.50,
    daySeen: '2024-01-15',
    onDiscount: false,
    recipientId: 1,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  } as unknown as ArticleRecordInstance;
}

export { TEST_USER_ID, BASE_DATE };
```

### Factory design rules

1. **One factory file per module** — `src/test/factories/<module>.factory.ts`
2. **Export a shared `TEST_USER_ID`** — always `'user-uuid-123'`, imported by both service and controller tests
3. **Realistic defaults** — Use real-looking values (`'Leche entera 1L'`, `'7501000000001'`), not `'foo'` or `'test'`
4. **Fixed `BASE_DATE`** — Stable timestamp for deterministic assertions
5. **Four factory types per module:**
   - `makeCreate<Entity>Dto()` — Input for create operations
   - `makeUpdate<Entity>Dto()` — Input for update operations
   - `make<Entity>Instance()` — Simulates what Sequelize returns from DB
   - `make<Entity>Dto()` — Simulates service output (what controller receives)
6. **Override pattern** — `{ ...defaults, ...overrides }` lets tests customize only the fields they care about:
   ```typescript
   // Test-specific data highlights what matters for THIS test
   makeArticleInstance({ concept: 'Leche entera 2L' })
   makeArticleDto({ lastPrice: 25.50 })
   ```

---

## 8. Writing Service Tests

The **reference implementation** is `src/services/__tests__/article.service.test.ts` (21 tests).

### 8.1 File header (from articles service test)

```typescript
jest.mock('@config/sequelize', () => require('../../test/unit/mocks/db.mock'));
jest.mock('@utils/transaction.util', () => require('../../test/unit/mocks/transaction.util.mock'));

import { db } from '@config/sequelize';
import ArticleService from '@services/article.service';
import { NotFoundError, BusinessRuleError } from '@errors/app-error';
import {
  makeCreateArticleDto,
  makeUpdateArticleDto,
  makeArticleInstance,
  makeArticleFilterDto,
  makeArticleDto,
  makeArticleRecordInstance,
  TEST_USER_ID,
} from '../../test/factories/article.factory';

const mockArticle = db.Article as jest.Mocked<typeof db.Article>;
const mockArticleRecord = db.ArticleRecord as jest.Mocked<typeof db.ArticleRecord>;
const mockExpenseItem = db.ExpenseItem as jest.Mocked<typeof db.ExpenseItem>;
```

**What's happening:**
1. `jest.mock('@config/sequelize', ...)` replaces the real Sequelize DB with `src/test/unit/mocks/db.mock.ts` (no real DB connection).
2. `jest.mock('@utils/transaction.util', ...)` replaces `withTransaction` with a passthrough that just calls the callback (no real transaction).
3. The logger is mocked globally in `src/test/unit/setup.ts` — no need to mock it here.
4. `db.Article` is cast to `jest.Mocked` for type-safe mock method access.

### 8.2 Test structure (from articles service test)

The articles service test covers every public method. Here is the full structure:

```
describe('ArticleService')
  describe('create')
    ✓ When valid data is provided, returns the created article DTO
    ✓ When creating an article, includes userId for user isolation
    ✓ When barcode already exists, propagates the constraint error

  describe('update')
    ✓ When article exists, returns the updated DTO
    ✓ When article does not exist, throws NotFoundError

  describe('delete')
    ✓ When article has no references, deletes successfully
    ✓ When article is referenced by expense items, throws BusinessRuleError
    ✓ When article does not exist, throws NotFoundError

  describe('findById')
    ✓ When article has price records, returns DTO with lastPrice
    ✓ When article has no price records, returns DTO without lastPrice
    ✓ When article does not exist, throws NotFoundError

  describe('findAll')
    ✓ When articles exist, returns rows mapped to DTOs with count
    ✓ When no articles match, returns empty rows with zero count

  describe('disableMultiple')
    ✓ When all articles exist, disables them successfully
    ✓ When some articles are not found, throws NotFoundError

  describe('createPriceRecord')
    ✓ When article exists, creates the price record successfully
    ✓ When article does not exist, throws NotFoundError

  describe('bulkCreate')
    ✓ When valid data is provided, creates and returns all article DTOs
    ✓ When empty array is provided, returns empty array

  describe('cleanupOldRecords')
    ✓ When old records exist, deletes them and returns the count
    ✓ When called without arguments, uses 365 days as default
```

### 8.3 Key patterns from the articles service test

**Pattern: Mock DB → Call service → Assert output**

```typescript
it('When valid data is provided, returns the created article DTO', async () => {
  // Arrange: tell the mock DB what to return
  (mockArticle.create as jest.Mock).mockResolvedValue(makeArticleInstance());

  // Act: call the real service method
  const result = await ArticleService.create(makeCreateArticleDto(), TEST_USER_ID);

  // Assert: check the output
  expect(result).toEqual(makeArticleDto());
});
```

**Pattern: Assert userId is passed (user isolation)**

```typescript
it('When creating an article, includes userId for user isolation', async () => {
  (mockArticle.create as jest.Mock).mockResolvedValue(makeArticleInstance());

  await ArticleService.create(makeCreateArticleDto(), TEST_USER_ID);

  expect(mockArticle.create).toHaveBeenCalledWith(
    expect.objectContaining({ userId: TEST_USER_ID }),
    expect.anything(),
  );
});
```

**Pattern: Test error propagation**

```typescript
it('When barcode already exists, propagates the constraint error', async () => {
  const uniqueError = new Error('Unique constraint violated');
  uniqueError.name = 'SequelizeUniqueConstraintError';
  (mockArticle.create as jest.Mock).mockRejectedValue(uniqueError);

  await expect(ArticleService.create(makeCreateArticleDto(), TEST_USER_ID))
    .rejects.toThrow('Unique constraint violated');
});
```

**Pattern: Test not-found path**

```typescript
it('When article does not exist, throws NotFoundError', async () => {
  (mockArticle.update as jest.Mock).mockResolvedValue([0, []]);

  await expect(ArticleService.update(999, makeUpdateArticleDto(), TEST_USER_ID))
    .rejects.toThrow(NotFoundError);
});
```

**Pattern: Test business rule guard**

```typescript
it('When article is referenced by expense items, throws BusinessRuleError', async () => {
  (mockExpenseItem.count as jest.Mock).mockResolvedValue(3);

  await expect(ArticleService.delete(1, TEST_USER_ID))
    .rejects.toThrow(BusinessRuleError);
});
```

**Pattern: Override factory for test-specific data**

```typescript
it('When article has price records, returns DTO with lastPrice', async () => {
  const records = [makeArticleRecordInstance({ price: 32.50 })];
  (mockArticle.findOne as jest.Mock).mockResolvedValue(makeArticleInstance({ records }));
  (mockArticleRecord.findOne as jest.Mock).mockResolvedValue(
    makeArticleRecordInstance({ price: 32.50 }),
  );

  const result = await ArticleService.findById(1, TEST_USER_ID);

  expect(result.lastPrice).toBe(32.50);
});
```

---

## 9. Writing Controller Tests

The **reference implementation** is `src/controllers/__tests__/article.controller.test.ts` (16 tests).

### 9.1 File header (from articles controller test)

```typescript
jest.mock('@services/article.service', () => require('../../test/unit/mocks/article.service.mock'));
jest.mock('@utils/validation.util', () => require('../../test/unit/mocks/validation.util.mock'));
jest.mock('@utils/user-context.util', () => require('../../test/unit/mocks/user-context.util.mock'));

import { Request, Response } from 'express';
import ArticleController from '@controllers/article.controller';
import ArticleService from '@services/article.service';
import { requireUserId } from '@utils/user-context.util';
import { validateDto } from '@utils/validation.util';
import {
  NotFoundError, BusinessRuleError, ForbiddenError, ValidationError,
} from '@errors/app-error';
import { makeArticleDto, TEST_USER_ID } from '../../test/factories/article.factory';

const mockService = ArticleService as jest.Mocked<typeof ArticleService>;
```

**What's happening:**
1. `jest.mock('@services/article.service', ...)` replaces the real service with `src/test/unit/mocks/article.service.mock.ts` (all methods are `jest.fn()`).
2. `jest.mock('@utils/validation.util', ...)` replaces `validateDto` with a passthrough that returns `data` as-is.
3. `jest.mock('@utils/user-context.util', ...)` replaces `requireUserId` with a passthrough that returns the `id`.
4. The controller is the REAL code under test — it calls the mocked service.

### 9.2 Mock request/response helpers (from articles controller test)

```typescript
function makeMockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: TEST_USER_ID },
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

function makeMockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
    send: jest.Mock;
  };
}
```

**Key details:**
- `makeMockReq` provides `user`, `body`, `params`, `query` — the four things controllers read from the request.
- `makeMockRes` chains `.status().json()` and `.status().send()` with `mockReturnThis()`.
- `next` is a simple `jest.fn()` created in `beforeEach`.

**These helpers are defined per test file** (not shared), because each module may need slightly different request shapes.

### 9.3 beforeEach setup (from articles controller test)

```typescript
describe('ArticleController', () => {
  let res: ReturnType<typeof makeMockRes>;
  let next: jest.Mock;

  beforeEach(() => {
    res = makeMockRes();
    next = jest.fn();
  });
```

Fresh `res` and `next` for every test. `clearAllMocks` in `setup.ts` resets the service mocks.

### 9.4 Test structure (from articles controller test)

```
describe('ArticleController')
  describe('create')
    ✓ When service succeeds, returns 201 with the created article
    ✓ When user is not authenticated, forwards ForbiddenError to next
    ✓ When validation fails, forwards ValidationError to next
    ✓ When service throws, forwards error to next

  describe('update')
    ✓ When service succeeds, returns the updated article
    ✓ When article not found, forwards NotFoundError to next

  describe('delete')
    ✓ When service succeeds, returns 204 with no body
    ✓ When article is in use, forwards BusinessRuleError to next

  describe('getById')
    ✓ When article exists, returns 200 with article data
    ✓ When article not found, forwards NotFoundError to next

  describe('list')
    ✓ When filters are valid, returns 200 with paginated results

  describe('disableMultiple')
    ✓ When service succeeds, returns message with disabled count
    ✓ When articles not found, forwards NotFoundError to next

  describe('createPriceRecord')
    ✓ When service succeeds, returns 201 with success message

  describe('cleanupOldRecords')
    ✓ When service succeeds, returns 200 with deleted count
    ✓ When service throws, forwards error to next
```

### 9.5 Key patterns from the articles controller test

**Pattern: Mock service → Call controller → Assert response**

```typescript
it('When service succeeds, returns 201 with the created article', async () => {
  const article = makeArticleDto();
  mockService.create.mockResolvedValue(article);

  await ArticleController.create(
    makeMockReq({ body: { concept: 'Leche entera 1L' } }),
    res,
    next,
  );

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(article);
});
```

**Pattern: Test ForbiddenError (no auth)**

```typescript
it('When user is not authenticated, forwards ForbiddenError to next', async () => {
  (requireUserId as jest.Mock).mockImplementationOnce(() => {
    throw new ForbiddenError('User authentication required');
  });

  await ArticleController.create(
    makeMockReq({ user: undefined }),
    res,
    next,
  );

  expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  expect(res.json).not.toHaveBeenCalled();
});
```

**Pattern: Test ValidationError**

```typescript
it('When validation fails, forwards ValidationError to next', async () => {
  (validateDto as jest.Mock).mockImplementationOnce(() => {
    throw new ValidationError('Validation failed', [{ field: 'concept', message: 'required' }]);
  });

  await ArticleController.create(makeMockReq(), res, next);

  expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  expect(res.json).not.toHaveBeenCalled();
});
```

**Pattern: Test service error forwarding**

```typescript
it('When service throws, forwards error to next', async () => {
  mockService.create.mockRejectedValue(new Error('DB error'));

  await ArticleController.create(makeMockReq(), res, next);

  expect(next).toHaveBeenCalledWith(expect.any(Error));
});
```

**Pattern: 204 No Content (delete)**

```typescript
it('When service succeeds, returns 204 with no body', async () => {
  mockService.delete.mockResolvedValue(undefined);

  await ArticleController.delete(
    makeMockReq({ params: { id: '1' } as unknown as Request['params'] }),
    res,
    next,
  );

  expect(res.status).toHaveBeenCalledWith(204);
  expect(res.send).toHaveBeenCalled();
});
```

**Pattern: params as Request['params'] cast**

```typescript
// Route params come as strings, cast required for TypeScript
makeMockReq({ params: { id: '1' } as unknown as Request['params'] })
```

---

## 10. Test Naming Convention

Every test follows the **3-part naming** pattern. The `describe` provides the "what", and `it` provides the "when" + "should".

Here are all 37 test names from the articles unit tests as reference:

### Service tests (21 tests)
```
describe('ArticleService')

  describe('create')
    ✓ When valid data is provided, returns the created article DTO
    ✓ When creating an article, includes userId for user isolation
    ✓ When barcode already exists, propagates the constraint error

  describe('update')
    ✓ When article exists, returns the updated DTO
    ✓ When article does not exist, throws NotFoundError

  describe('delete')
    ✓ When article has no references, deletes successfully
    ✓ When article is referenced by expense items, throws BusinessRuleError
    ✓ When article does not exist, throws NotFoundError

  describe('findById')
    ✓ When article has price records, returns DTO with lastPrice
    ✓ When article has no price records, returns DTO without lastPrice
    ✓ When article does not exist, throws NotFoundError

  describe('findAll')
    ✓ When articles exist, returns rows mapped to DTOs with count
    ✓ When no articles match, returns empty rows with zero count

  describe('disableMultiple')
    ✓ When all articles exist, disables them successfully
    ✓ When some articles are not found, throws NotFoundError

  describe('createPriceRecord')
    ✓ When article exists, creates the price record successfully
    ✓ When article does not exist, throws NotFoundError

  describe('bulkCreate')
    ✓ When valid data is provided, creates and returns all article DTOs
    ✓ When empty array is provided, returns empty array

  describe('cleanupOldRecords')
    ✓ When old records exist, deletes them and returns the count
    ✓ When called without arguments, uses 365 days as default
```

### Controller tests (16 tests)
```
describe('ArticleController')

  describe('create')
    ✓ When service succeeds, returns 201 with the created article
    ✓ When user is not authenticated, forwards ForbiddenError to next
    ✓ When validation fails, forwards ValidationError to next
    ✓ When service throws, forwards error to next

  describe('update')
    ✓ When service succeeds, returns the updated article
    ✓ When article not found, forwards NotFoundError to next

  describe('delete')
    ✓ When service succeeds, returns 204 with no body
    ✓ When article is in use, forwards BusinessRuleError to next

  describe('getById')
    ✓ When article exists, returns 200 with article data
    ✓ When article not found, forwards NotFoundError to next

  describe('list')
    ✓ When filters are valid, returns 200 with paginated results

  describe('disableMultiple')
    ✓ When service succeeds, returns message with disabled count
    ✓ When articles not found, forwards NotFoundError to next

  describe('createPriceRecord')
    ✓ When service succeeds, returns 201 with success message

  describe('cleanupOldRecords')
    ✓ When service succeeds, returns 200 with deleted count
    ✓ When service throws, forwards error to next
```

---

## 11. What to Test Per Layer

### Service layer — what to cover

For each public service method, test:

| Category | Example from articles test | What to assert |
|----------|---------------------------|---------------|
| **Happy path** | `create` with valid data | Returns correct DTO shape |
| **userId isolation** | `create` includes userId | `expect.objectContaining({ userId })` |
| **Not found** | `update` with nonexistent ID | `rejects.toThrow(NotFoundError)` |
| **Business rule guard** | `delete` when article is in use | `rejects.toThrow(BusinessRuleError)` |
| **Constraint error** | `create` with duplicate barcode | `rejects.toThrow('Unique constraint')` |
| **Empty result** | `findAll` with no matches | `rows.length === 0`, `count === 0` |
| **Default parameter** | `cleanupOldRecords()` no args | Uses 365 days |
| **Associated data** | `findById` with price records | `lastPrice` populated from records |

### Controller layer — what to cover

For each controller method, test:

| Category | Example from articles test | What to assert |
|----------|---------------------------|---------------|
| **Happy path** | `create` succeeds | `res.status(201)`, `res.json(article)` |
| **ForbiddenError** | No authenticated user | `next(ForbiddenError)`, `res.json` NOT called |
| **ValidationError** | Invalid input | `next(ValidationError)`, `res.json` NOT called |
| **Service error** | Service throws | `next(Error)` |
| **NotFoundError** | Resource not found | `next(NotFoundError)` |
| **BusinessRuleError** | Business rule violated | `next(BusinessRuleError)` |
| **204 response** | Delete succeeds | `res.status(204)`, `res.send()` |
| **Response message** | Disable multiple | `res.json({ message: '2 articles disabled' })` |

**Important:** The `create` method should always have 4 tests (happy path, ForbiddenError, ValidationError, service error). Other methods need at minimum happy path + error path.

---

## 12. Mocking Patterns

### 12.1 The DB mock (`src/test/unit/mocks/db.mock.ts`)

From the articles implementation:

```typescript
export const db = {
  Article: {
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    bulkCreate: jest.fn(),
  },
  ArticleRecord: {
    create: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
  },
  ExpenseItem: {
    count: jest.fn(),
  },
};
```

Only mock the Sequelize methods that the service actually calls. Check the service source to see which methods it uses.

**When adding a new module:** Add the new model's methods to `src/test/unit/mocks/db.mock.ts`:
```typescript
export const db = {
  // ... existing models ...
  Recipient: {
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
  },
};
```

### 12.2 The service mock (`src/test/unit/mocks/article.service.mock.ts`)

```typescript
const ArticleService = {
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  disableMultiple: jest.fn(),
  createPriceRecord: jest.fn(),
  cleanupOldRecords: jest.fn(),
};

export default ArticleService;
```

Mirror every public method from the real service. Used by controller tests.

### 12.3 The transaction mock (`src/test/unit/mocks/transaction.util.mock.ts`)

```typescript
const withTransaction = jest.fn(<T>(cb: (t: unknown) => Promise<T>) => cb({}));

export default withTransaction;
```

This mock calls the callback immediately with an empty object as the "transaction". It removes the real transaction behavior (commit/rollback) so service tests only test business logic.

### 12.4 The validation mock (`src/test/unit/mocks/validation.util.mock.ts`)

```typescript
export const validateDto = jest.fn((_schemaName: string, data: unknown) => data);
```

Returns the input data as-is (passthrough). Controller tests can override this per-test with `mockImplementationOnce` to simulate validation failures.

### 12.5 The user context mock (`src/test/unit/mocks/user-context.util.mock.ts`)

```typescript
export const requireUserId = jest.fn((id: string | undefined) => id);
```

Returns the ID as-is (passthrough). Controller tests can override this per-test with `mockImplementationOnce` to simulate missing auth.

### 12.6 Overriding mocks per test with `mockImplementationOnce`

From the articles controller test — this is how you simulate error paths:

```typescript
// Override validateDto for ONE test to throw
(validateDto as jest.Mock).mockImplementationOnce(() => {
  throw new ValidationError('Validation failed', [{ field: 'concept', message: 'required' }]);
});

// Override requireUserId for ONE test to throw
(requireUserId as jest.Mock).mockImplementationOnce(() => {
  throw new ForbiddenError('User authentication required');
});
```

`mockImplementationOnce` overrides only the next call, then reverts to the default passthrough. This is why `clearAllMocks` in `afterEach` is important — it resets everything clean for the next test.

---

## 13. Error Testing Patterns

### Service tests — assert error type

```typescript
// NotFoundError
await expect(ArticleService.findById(999, TEST_USER_ID))
  .rejects.toThrow(NotFoundError);

// BusinessRuleError
await expect(ArticleService.delete(1, TEST_USER_ID))
  .rejects.toThrow(BusinessRuleError);

// Sequelize constraint error (propagated)
await expect(ArticleService.create(makeCreateArticleDto(), TEST_USER_ID))
  .rejects.toThrow('Unique constraint violated');
```

### Controller tests — assert error forwarded to `next`

```typescript
// Assert error was forwarded
expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));

// Assert response was NOT sent (error middleware handles it)
expect(res.json).not.toHaveBeenCalled();
```

**Why `expect(res.json).not.toHaveBeenCalled()`?**

This verifies the controller's error handling is correct: when an error occurs, the controller should call `next(error)` instead of sending a response. The error middleware handles the HTTP response.

---

## 14. Rules to Avoid Anti-Patterns

These rules were established during the articles implementation review:

### 1. Assert on outputs, not on internal query structure

```typescript
// BAD — white-box, inspects internal DB call structure
expect(mockArticle.findAndCountAll).toHaveBeenCalledWith(
  expect.objectContaining({ where: { isEnabled: true, userId: TEST_USER_ID } })
);

// GOOD — black-box, tests the output
const result = await ArticleService.findAll(makeArticleFilterDto(), TEST_USER_ID);
expect(result.rows).toHaveLength(2);
expect(result.count).toBe(2);
```

**Exception:** Testing `userId` inclusion is acceptable because it verifies user isolation (a security concern):
```typescript
expect(mockArticle.create).toHaveBeenCalledWith(
  expect.objectContaining({ userId: TEST_USER_ID }),
  expect.anything(),
);
```

### 2. Use realistic data from factories, not `{}`

```typescript
// BAD — unrealistic mock, hides what data looks like
(mockArticle.findAndCountAll as jest.Mock).mockResolvedValue({
  rows: [{}, {}],
  count: 2,
});

// GOOD — realistic data from factory
(mockArticle.findAndCountAll as jest.Mock).mockResolvedValue({
  rows: [
    makeArticleInstance({ id: 1, concept: 'Leche entera 1L' }),
    makeArticleInstance({ id: 2, concept: 'Pan integral' }),
  ],
  count: 2,
});
```

### 3. Use `TEST_USER_ID` from the factory, not hardcoded strings

```typescript
// BAD — different userId values across files
await ArticleService.create(dto, 'test-user-id');
await ArticleService.create(dto, 'user-123');

// GOOD — consistent, imported from factory
import { TEST_USER_ID } from '../../test/factories/article.factory';
await ArticleService.create(dto, TEST_USER_ID);
```

### 4. Test both ForbiddenError and ValidationError in controller create

Every controller `create` method should test:
- Happy path (service succeeds)
- ForbiddenError (via `requireUserId` mock override)
- ValidationError (via `validateDto` mock override)
- Service error (service rejects)

### 5. Keep `console.error` and `console.warn` visible

The global setup suppresses `console.log/info/debug` but NOT `error/warn`. This lets real errors surface during debugging while keeping test output clean.

### 6. Don't test framework behavior

Don't test that Sequelize applies `where` clauses or that Joi validates schemas. Trust the framework. Test your business logic and error handling.

---

## 15. Running Tests

```bash
npm run test:unit           # All unit tests (600+ tests)
npm run test                # Same as test:unit
npm run test:watch          # Watch mode (re-run on file changes)
npm run test:coverage       # With coverage report
```

### Run a specific test file

```bash
npx cross-env NODE_ENV=test jest --config jest.config.js \
  --testPathPatterns="article.service"

npx cross-env NODE_ENV=test jest --config jest.config.js \
  --testPathPatterns="article.controller"
```

---

## 16. Adding Tests for a New Module

Step-by-step guide using the articles module as a reference. Replace `<Module>` with your module name (e.g., `Recipient`).

### Step 1: Create the factory

Create `src/test/factories/<module>.factory.ts`:

```typescript
import { Create<Module>Dto, Update<Module>Dto, <Module>Dto } from '@interfaces/<module>.dto';
import { <Module>Instance } from '@models/<module>.model';

const BASE_DATE = new Date('2024-01-15T10:00:00Z');

// Import the shared TEST_USER_ID
export { TEST_USER_ID } from './article.factory';
// OR define it locally if this is the first module:
// export const TEST_USER_ID = 'user-uuid-123';

export function makeCreate<Module>Dto(overrides = {}): Create<Module>Dto {
  return { /* realistic defaults */, ...overrides };
}

export function makeUpdate<Module>Dto(overrides = {}): Update<Module>Dto {
  return { /* realistic defaults */, ...overrides };
}

export function make<Module>Instance(overrides = {}): <Module>Instance {
  return { /* all model fields with realistic values */, ...overrides } as unknown as <Module>Instance;
}

export function make<Module>Dto(overrides = {}): <Module>Dto {
  return { /* service output shape */, ...overrides };
}
```

### Step 2: Update the DB mock

Add the new model's methods to `src/test/unit/mocks/db.mock.ts`:

```typescript
export const db = {
  // ... existing models ...
  <Module>: {
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
  },
};
```

Only add the methods the service actually calls.

### Step 3: Create the service mock

Create `src/test/unit/mocks/<module>.service.mock.ts`:

```typescript
const <Module>Service = {
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  // ... all public methods
};

export default <Module>Service;
```

### Step 4: Write the service test

Create `src/services/__tests__/<module>.service.test.ts`.

Copy the structure from `article.service.test.ts`:
1. Mock `@config/sequelize` and `@utils/transaction.util` with explicit paths to `src/test/unit/mocks/`
2. Import the real service, error classes, and factories
3. Cast `db.<Model>` to `jest.Mocked`
4. Write `describe` blocks for each public method
5. Cover: happy path, not found, business rules, edge cases

### Step 5: Write the controller test

Create `src/controllers/__tests__/<module>.controller.test.ts`.

Copy the structure from `article.controller.test.ts`:
1. Mock `@services/<module>.service`, `@utils/validation.util`, `@utils/user-context.util` with explicit paths to `src/test/unit/mocks/`
2. Copy `makeMockReq()` and `makeMockRes()` helpers (adjust `makeMockReq` if needed)
3. Write `describe` blocks for each controller method
4. Cover: happy path, ForbiddenError, ValidationError, service errors

### Step 6: Run and verify

```bash
npm run test:unit
npm run test:all   # Ensure integration tests still pass too
```

---

## 17. Checklist for New Modules

Use `src/services/__tests__/article.service.test.ts` and `src/controllers/__tests__/article.controller.test.ts` as your reference implementation for every step.

### Factory
- [ ] Create `src/test/factories/<module>.factory.ts`
- [ ] Export `makeCreate<Module>Dto()`, `makeUpdate<Module>Dto()`, `make<Module>Instance()`, `make<Module>Dto()`
- [ ] Use realistic defaults (real-looking names, valid IDs, fixed `BASE_DATE`)
- [ ] Import/re-export `TEST_USER_ID` from `article.factory.ts`
- [ ] All factories accept `overrides` parameter

### Mocks
- [ ] Add model to `src/test/unit/mocks/db.mock.ts` with only the Sequelize methods the service uses
- [ ] Create `src/test/unit/mocks/<module>.service.mock.ts` with `jest.fn()` for every public method

### Service test
- [ ] Create `src/services/__tests__/<module>.service.test.ts`
- [ ] Mock `@config/sequelize` and `@utils/transaction.util` with explicit paths to `src/test/unit/mocks/`
- [ ] One `describe` block per public service method
- [ ] Test happy path for every method
- [ ] Test `NotFoundError` for every method that does a lookup
- [ ] Test `BusinessRuleError` for any guard conditions
- [ ] Test constraint errors if unique fields exist
- [ ] Test edge cases (empty arrays, default parameters)
- [ ] Test userId inclusion (user isolation) for create at minimum

### Controller test
- [ ] Create `src/controllers/__tests__/<module>.controller.test.ts`
- [ ] Mock `@services/<module>.service`, `@utils/validation.util`, `@utils/user-context.util` with explicit paths to `src/test/unit/mocks/`
- [ ] Define `makeMockReq()` and `makeMockRes()` helpers in the file
- [ ] `beforeEach` creates fresh `res` and `next`
- [ ] One `describe` block per controller method
- [ ] `create` has 4 tests: happy path, ForbiddenError, ValidationError, service error
- [ ] Every method tests at least happy path + error forwarding
- [ ] Assert `res.json` NOT called on error paths
- [ ] Assert correct HTTP status codes (201 for create, 204 for delete, 200 for others)

### Naming
- [ ] All test names follow `When <scenario>, should/returns/throws/forwards <result>`
- [ ] `describe` blocks match the method name (`create`, `update`, `delete`, `findById`, etc.)

### Verification
- [ ] `npm run test:unit` — all tests pass
- [ ] `npm run test:all` — unit + integration still pass
- [ ] No new mocks added to global `src/test/unit/setup.ts` (only logger is mocked globally)

