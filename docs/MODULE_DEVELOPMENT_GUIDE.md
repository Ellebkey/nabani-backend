# Module Development Guide

This guide provides a comprehensive blueprint for creating new modules in the MyExpenses backend, based on the Article module analysis and established patterns.

## Table of Contents

1. [Module Architecture](#module-architecture)
2. [File Structure & Naming Conventions](#file-structure--naming-conventions)
3. [TypeScript & Strict Typing Rules](#typescript--strict-typing-rules)
4. [Import Ordering Standards](#import-ordering-standards)
5. [Error Handling Patterns](#error-handling-patterns)
6. [Database Access Patterns](#database-access-patterns)
7. [Code Patterns & Best Practices](#code-patterns--best-practices)
8. [Step-by-Step Module Creation](#step-by-step-module-creation)
9. [Templates & Examples](#templates--examples)
10. [Common Utilities](#common-utilities)

## Module Architecture

### 6-Layer Structure

```
Model → Route → Controller → Service → DTO → Validation
```

**Layer Responsibilities:**

1. **Model** (`src/models/{entity}.model.ts`)
   - Database schema definition
   - Sequelize model factory
   - Associations with other models
   - Virtual attributes

2. **Route** (`src/routes/{entity}.route.ts`)
   - HTTP route definitions
   - Middleware application (auth, validation)
   - Route-to-controller mapping

3. **Controller** (`src/controllers/{entity}.controller.ts`)
   - HTTP request/response handling
   - DTO validation
   - Service method calls
   - Error passing to next middleware

4. **Service** (`src/services/{entity}.service.ts`)
   - Business logic implementation
   - Database operations
   - Error throwing
   - Transaction management

5. **DTO** (`src/interfaces/{entity}.dto.ts`)
   - Data transfer objects
   - Type definitions
   - Interface contracts

6. **Validation** (`src/validations/{entity}.validation.ts`)
   - Joi schema definitions
   - Input validation rules
   - Schema registration

### Dependency Flow

```
Route → Controller → Service → Model
  ↓        ↓          ↓        ↓
Auth → Validation → Business → Database
```

## File Structure & Naming Conventions

### File Naming
- **Pattern**: `{entity}.{type}.ts` (kebab-case)
- **Examples**: 
  - `article.model.ts`
  - `payment-method.service.ts`
  - `expense-item.controller.ts`

### Class Naming
- **Pattern**: `{Entity}{Type}` (PascalCase)
- **Examples**:
  - `ArticleInstance` (model)
  - `ArticleService` (service)
  - `PaymentMethodController` (controller)

### Method Naming

#### CRUD Operations (consistent across services and controllers)
- `create` - Create new entity
- `update` - Update existing entity  
- `delete` - Delete entity
- `findById` or `getById` - Get single entity
- `findAll` or `list` - Get list of entities

#### Other Methods
- **Pattern**: camelCase verbs
- **Examples**: `disableMultiple`, `createPriceRecord`, `cleanupOldRecords`

### Database Field Mapping
- **Database**: snake_case (`created_at`, `is_enabled`)
- **JavaScript**: camelCase (`createdAt`, `isEnabled`)
- **Use field mapping**: `field: 'is_enabled'` in model definitions

## TypeScript & Strict Typing Rules

### Core Rules
- **NEVER use `any` type** - use proper types, generics, or `unknown` with type narrowing. For Sequelize `.get()` results, cast explicitly with `as Type`. For associations accessed on model instances, declare them on the class (e.g., `declare subcategories?: SubcategoryInstance[]`) instead of casting with `as any`.
- **NEVER use `import type`** - always use regular `import { ... }` for consistency across the codebase.
- **NEVER use `moment`** - this project uses `date-fns` for all date operations. `moment` is deprecated and being removed. Use `addMinutes`, `format`, `set`, `parseISO`, etc. from `date-fns`.
- **Always use `validateDto` for ALL request inputs** - this applies to `req.query`, `req.body`, and `req.params`. Never use `as string`, `+req.params.id`, or `req.body as { type }` manual casts. Reuse shared `entityId`/`entityUuid` schemas from `src/validations/shared.validation.ts` for route params.
- **Always specify explicit return types** on functions
- **Prefer destructuring** in variable assignments:
  ```typescript
  // ✅ Good
  const { id, concept, brand } = dto;

  // ❌ Avoid
  const id = dto.id;
  const concept = dto.concept;
  const brand = dto.brand;
  ```
- **Prefer object literal lookups over `switch`/`case`** - use a `Record<string, T>` or plain object for value mapping:
  ```typescript
  // ✅ Good
  const statusLabels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
  };
  const label = statusLabels[status] || 'Desconocido';

  // ❌ Avoid
  switch (status) {
    case 'active': return 'Activo';
    case 'inactive': return 'Inactivo';
    default: return 'Desconocido';
  }
  ```

### Model Types
```typescript
export class ArticleInstance extends BaseModelInstance<ArticleInstance> {
  declare id: CreationOptional<number>;
  declare concept: string;
  declare details: CreationOptional<string>;
  declare isEnabled: CreationOptional<boolean>;
  declare createdAt: CreationOptional<string>;  // Use string for Sequelize/TypeScript compatibility
  declare updatedAt: CreationOptional<string>;  // Use string for Sequelize/TypeScript compatibility
}
```

> **Note:** Timestamps use `string` type instead of `Date` due to Sequelize/TypeScript serialization behavior.

### Generic Types
```typescript
// Type-safe validation
const dto = validateDto<CreateArticleDto>('createArticle', req.body);

// Type-safe list responses
export type ArticleListDto = BaseListDto<ArticleDto>;

// Type-safe where clauses
const where: WhereClause = {};
```

### Comments Philosophy

**Minimize comments** - code should be self-documenting through clear naming and structure.

**When to add comments:**
- Complex business logic that isn't obvious from the code
- Non-intuitive algorithms or calculations
- Important edge cases or gotchas
- `@throws` annotations for error conditions

**When NOT to add comments:**
- Simple CRUD operations (the method name is enough)
- Obvious parameter descriptions
- Section markers in imports (use blank lines instead)
- Inline comments explaining what code does (refactor for clarity instead)

```typescript
// ✅ Good - complex logic needs explanation
/**
 * Calculates compound interest with monthly capitalization.
 * Uses the formula: A = P(1 + r/n)^(nt)
 * @throws BusinessRuleError if rate exceeds legal maximum
 */
calculateInterest = async (principal: number, rate: number): Promise<number> => {
  // Implementation
};

// ✅ Good - simple method, no comment needed
create = async (dto: CreateArticleDto): Promise<ArticleDto> =>
  withTransaction(async (transaction) => {
    const article = await db.Article.create(dto, { transaction });
    return this.toArticleDto(article);
  });

// ❌ Avoid - obvious from method name and types
/**
 * Creates a new article in the system.
 * @param dto - The data transfer object containing article creation details
 * @returns Promise resolving to the created article DTO
 */
create = async (dto: CreateArticleDto): Promise<ArticleDto> => { ... };
```

## Import Ordering Standards

### Standardized Import Order

All TypeScript files (services, controllers, models, etc.) must follow this consistent import order. **Do NOT add numbered section comments** - the grouping should be self-evident from blank line separation:

```typescript
import { Transaction, Op } from 'sequelize';
import { format, startOfMonth } from 'date-fns';
import bcrypt from 'bcrypt';
import _ from 'lodash';

import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { redisClient } from '@config/redis-config';

import withTransaction from '@utils/transaction.util';
import { AppError } from '@errors/app-error';

import AccountLedgerService from '@services/account-ledger.service';
import PaymentMethodService from '@services/payment-method.service';

import { queryExpensesByDay } from '@queries/account.queries';

import { AccountSectionInstance } from '@models/account-sections.model';

import { NotFoundError, BusinessRuleError } from '@errors/app-error';

import { WhereClause } from '@interfaces/base.dto';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountDto,
  AccountListDto,
  AccountFilterDto,
} from '@interfaces/account.dto';
```

### Key Principles

1. **Use blank lines** to separate import groups visually (no section comments needed)
2. **External dependencies** come before internal ones
3. **Config and utilities** before business logic imports
4. **DTOs at the end** since they typically have multiple imports
5. **Smaller interface imports first** (like `WhereClause`) before larger DTO groups
6. **Alphabetical ordering** within each group when practical
7. **Related imports grouped** together logically

### Import Group Descriptions

| Order | Group | Description | Examples |
|-------|-------|-------------|----------|
| 1 | External packages | Node.js modules and npm packages | `sequelize`, `date-fns`, `lodash`, `bcrypt` |
| 2 | Config imports | Application configuration modules | `@config/sequelize`, `@config/logger` |
| 3 | Utils | Utility functions and helpers | `@utils/transaction.util` |
| 4 | Services | Internal service dependencies | `@services/account-ledger.service` |
| 5 | Queries | Raw query modules (when needed) | `@queries/account.queries` |
| 6 | Models | Database model instances | `@models/account.model` |
| 7 | Errors | Error classes and domain errors | `@errors/app-error` |
| 8 | Interfaces/DTOs | Type definitions and DTOs | `@interfaces/account.dto` |

### Benefits

- **Consistency** across all files in the codebase
- **Easy navigation** - developers know where to find specific imports
- **Reduced merge conflicts** from import reordering
- **Clear separation** of concerns and dependencies
- **Improved readability** and maintainability

## Error Handling Patterns

### Core Principle: Services Throw, Controllers Catch

**Services** handle business logic and **throw** appropriate errors. They should NOT catch errors unless absolutely necessary for specific business logic.

**Controllers** only handle HTTP layer, **catch** errors from services and pass them to Express error middleware.

### Service Layer - When to Throw vs When to Catch

#### ✅ Services Should Throw Errors (Default Pattern)
Services handle business logic and throw appropriate errors:

```typescript
// ✅ Services throw errors - let them bubble up
class ArticleService {
  findById = async (id: number): Promise<ArticleDto> => {
    const article = await db.Article.findByPk(id);
    
    if (!article) {
      throw new NotFoundError('Article', id);
    }
    
    return this.toArticleDto(article);
  };

  // ✅ Private methods also throw - no try-catch needed
  private createArticleRecord = async (data: CreateData, transaction: Transaction): Promise<void> => {
    // Database operations can fail - let errors bubble up to transaction wrapper
    await db.ArticleRecord.create(data, { transaction });
    await db.RelatedRecord.bulkCreate(relatedData, { transaction });
  };
}
```

#### ✅ When Services CAN Use Try-Catch

Services should only use try-catch in these specific scenarios:

```typescript
// ✅ 1. Error Transformation - Converting external errors to domain errors
class PaymentService {
  processPayment = async (paymentData: PaymentDto): Promise<PaymentResult> => {
    try {
      return await externalPaymentAPI.charge(paymentData);
    } catch (error) {
      // Transform external API error to our domain error
      throw new BusinessRuleError(`Payment processing failed: ${error.message}`);
    }
  };
}

// ✅ 2. Cleanup Operations (prefer finally blocks)
class FileService {
  processFile = async (filePath: string): Promise<void> => {
    let fileHandle: FileHandle | null = null;
    try {
      fileHandle = await fs.open(filePath, 'r');
      await this.processFileContent(fileHandle);
    } finally {
      // Cleanup regardless of success/failure
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  };
}

// ✅ 3. Graceful Degradation (rare cases)
class NotificationService {
  sendNotification = async (message: string): Promise<void> => {
    try {
      await this.sendEmail(message);
    } catch (emailError) {
      // Fallback to SMS if email fails (business requirement)
      logger.warn('Email failed, falling back to SMS', { error: emailError.message });
      await this.sendSMS(message);
    }
  };
}
```

#### ❌ Services Should NOT Use Try-Catch For

```typescript
// ❌ Don't catch and re-throw without transformation
private createHelper = async (data: Data, transaction: Transaction): Promise<void> => {
  try {
    await db.Entity.create(data, { transaction });
  } catch (error) {
    // This is redundant - just let the error bubble up
    throw error; // OR throw new Error(error)
  }
};

// ❌ Don't catch database errors just to log them
create = async (dto: CreateDto): Promise<EntityDto> => {
  try {
    const result = await db.Entity.create(dto);
    return this.toDto(result);
  } catch (error) {
    // Don't do this - let transaction wrapper and global error handler deal with it
    logger.error('Database error', error);
    throw error;
  }
};
```

### Private Method Error Handling

Private service methods (helpers) should follow the same rules as public methods:

```typescript
class ExpenseService {
  // ✅ Public method uses transaction wrapper
  create = async (dto: CreateExpenseDto): Promise<ExpenseDto> => 
    withTransaction(async (transaction: Transaction) => {
      const expense = await db.Expense.create(dto, { transaction });
      
      if (dto.articles?.length > 0) {
        // Call private method - it will throw if there's an error
        await this.createArticlesRecord(dto.articles, expense, transaction);
      }
      
      return this.toExpenseDto(expense);
    });

  // ✅ Private method throws errors - no try-catch needed
  private createArticlesRecord = async (
    articles: ArticleData[],
    expense: ExpenseInstance,
    transaction: Transaction
  ): Promise<void> => {
    // These operations can fail - let errors bubble up to withTransaction
    const expenseItems = articles.map(article => ({
      expense_id: expense.id,
      article_id: article.articleId,
      quantity: article.quantity,
      // ... other fields
    }));

    await db.ExpenseItem.bulkCreate(expenseItems, { transaction });
    await db.ArticleRecord.bulkCreate(articleRecords, { transaction });
    // No try-catch needed - withTransaction will handle rollback on any error
  };
}
```

### Transaction Error Handling

The `withTransaction` utility automatically handles:
- **Rollback on any error** - If any operation throws, the entire transaction is rolled back
- **Commit on success** - If all operations succeed, the transaction is committed
- **Error propagation** - Errors are automatically passed up to the caller

```typescript
// ✅ Transaction wrapper handles all error scenarios
create = async (dto: CreateDto): Promise<EntityDto> =>
  withTransaction(async (transaction: Transaction) => {
    // All these operations are atomic
    const entity = await db.Entity.create(dto, { transaction });
    await this.createRelatedRecords(entity, transaction); // Can throw
    await this.updateAssociations(entity, transaction);   // Can throw
    
    // If any operation throws:
    // - Transaction is automatically rolled back
    // - Error bubbles up to controller
    // - No manual cleanup needed
    
    return this.toEntityDto(entity);
  });
```

### Controller Layer - Catch and Pass
Controllers only handle HTTP layer, catch errors and pass to middleware:

```typescript
// ✅ Controllers catch and pass to next
class ArticleController {
  getById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityIdParamsDto>('entityId', req.params);
      const article = await this.articleService.findById(id);
      return res.json(article);
    } catch (error) {
      return next(error);
    }
  };
}
```

### Custom Error Classes
```typescript
// Use specific error types
throw new NotFoundError('Article', id);
throw new BusinessRuleError('Cannot delete article: it is used in expense items');
throw new ConflictError('Article with this concept already exists');
```

### Error Handling Anti-Patterns

#### ❌ Don't Do This

```typescript
// ❌ Catching and re-throwing without transformation
private helperMethod = async (): Promise<void> => {
  try {
    await db.operation();
  } catch (error) {
    throw error; // Useless - just let it bubble up
  }
};

// ❌ Losing error context
private helperMethod = async (): Promise<void> => {
  try {
    await db.operation();
  } catch (error) {
    throw new Error(error); // Loses stack trace and error type
  }
};

// ❌ Generic error handling in services
someMethod = async (): Promise<void> => {
  try {
    await businessLogic();
  } catch (error) {
    // Services shouldn't do generic error handling
    logger.error('Something went wrong', error);
    throw error;
  }
};
```

### Best Practices Summary

1. **Services throw errors** - Don't catch unless you need to transform or add context
2. **Private methods throw errors** - Same rules apply, no special handling needed
3. **Use withTransaction** - It handles rollback automatically on any error  
4. **Transform external errors** - Convert third-party API errors to domain errors
5. **Preserve error context** - Don't create new generic errors from caught errors
6. **Controllers catch and delegate** - Pass all errors to Express error middleware
7. **Use custom error classes** - NotFoundError, BusinessRuleError, ConflictError, etc.

## Authentication Context Pattern

### Core Principle: User Context Through Request Chain

For modules that handle user-owned resources (accounts, expenses, etc.), the authenticated user's context must be passed from the authentication middleware through the controller to the service layer.

### 1. Express Request Interface Extension

**Create**: `src/interfaces/express.d.ts`

```typescript
import { JWTPayload } from '@interfaces/user.dto';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
```

This extends the Express Request type to include the authenticated user's data from the JWT token.

### 2. Authentication Middleware Pattern

The auth middleware validates the token and attaches user payload to the request:

```typescript
// src/middlewares/auth.ts
export default class Auth {
  public checkAuth = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization;

    if (!token) {
      return next(new UnauthorizedError('Authentication token is required'));
    }

    try {
      // Validate token and get user payload
      const userPayload = this.jwtService.validateToken(token);

      // ✅ Attach user payload to request for controllers
      req.user = userPayload;

      return next();
    } catch {
      // 401 so the frontend interceptor can trigger token refresh
      return next(new UnauthorizedError('Token authentication failed'));
    }
  };
}
```

### 3. Controller Pattern - Pass User Context

Controllers resolve the user context with `requireUserId` (from
`@utils/user-context.util`) and pass a guaranteed, non-optional `userId` to
services. `requireUserId` throws `ForbiddenError` when the request has no
authenticated user:

```typescript
import { requireUserId } from '@utils/user-context.util';

// ✅ Controllers resolve user context, services receive a required userId
class AccountController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const userId = requireUserId(req.user?.id);
      const dto = validateDto<CreateAccountDto>('createAccount', req.body);
      const account = await this.accountService.create(dto, userId);

      return res.status(201).json(account);
    } catch (error) {
      return next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const userId = requireUserId(req.user?.id);
      const filters = validateDto<AccountFilterDto>('accountFilter', req.query);
      const result = await this.accountService.findAll(filters, userId);

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };
}
```

For endpoints with stricter requirements, `@utils/user-context.util` also
exports:

- `requireSelf(req.user, targetUserId)` — the caller may only act on their own
  user record
- `requireSelfOrAdmin(req.user, targetUserId)` — same, but admins may act on
  anyone
- `requireAdmin(req.user)` — admin-only endpoints

All of them return the resolved `userId` and throw `ForbiddenError` otherwise.

### 4. Service Pattern - Validate and Use Authentication

Services take a **required** `userId: string` parameter and scope every query
and write with it. They never receive an optional/undefined user:

```typescript
// ✅ Services receive a guaranteed userId and filter by ownership
class AccountService {
  /**
   * Creates a new account for the authenticated user
   * @param dto - Account creation data
   * @param ownerId - ID of authenticated user (validated by the controller)
   */
  create = async (dto: CreateAccountDto, ownerId: string): Promise<AccountDto> => {
    return withTransaction(async (transaction: Transaction) => {
      const account = await db.Account.create({
        ...dto,
        currentAmount: +dto.currentAmount,
        ownerId, // ✅ Associate with authenticated user
      }, { transaction });

      logger.info('Account created', { accountId: account.id, ownerId });
      return this.toAccountDto(account);
    });
  };

  /**
   * Lists accounts belonging to the authenticated user
   * @param filters - Filter parameters
   * @param ownerId - ID of authenticated user (validated by the controller)
   */
  findAll = async (filters: AccountFilterDto, ownerId: string): Promise<AccountListDto> => {
    const { limit = 50, offset = 0 } = filters;

    // ✅ Filter by owner - users can only see their own resources
    const accounts = await db.Account.findAll({
      where: { 
        ownerId, // ✅ Security: Only user's own accounts
        isPrimary: true 
      },
      limit: +limit,
      offset: +offset,
      attributes: ['id', 'name', 'currentAmount', 'colorPalette', 'ownerId'],
      order: [['name', 'ASC']],
    });

    return {
      rows: accounts.map((account) => this.toAccountDto(account)),
      count: accounts.length,
    };
  };
}
```

### 5. Database Model Pattern

Models should include the ownership relationship:

```typescript
// ✅ Model includes owner foreign key
export class AccountInstance extends BaseModelInstance<AccountInstance> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare currentAmount: number;
  declare ownerId: ForeignKey<string>; // ✅ Owner relationship
  // ... other fields
}

const AccountFactory = (sequelize: Sequelize): ModelClass<AccountInstance> => {
  AccountInstance.init(
    {
      // ... other fields
      ownerId: {
        field: 'owner_id',
        type: DataTypes.UUID,
        allowNull: false, // ✅ Always required
      },
    },
    { /* sequelize options */ }
  );

  // ✅ Define association with User model
  AccountInstance.associate = (models) => {
    AccountInstance.belongsTo(models.User, { 
      as: 'owner', 
      foreignKey: 'owner_id' 
    });
  };

  return AccountInstance;
};
```

### Authentication Context Best Practices

1. **Controllers resolve the user** - `const userId = requireUserId(req.user?.id);`
2. **Services take a required `userId: string`** - never optional, no re-validation
3. **Database queries AND writes filter by owner** - `where: { id, userId }`;
   for updates, compare the affected-row count against the expected count and
   throw `NotFoundError` on mismatch (foreign IDs must look nonexistent)
4. **Use the right guard** - `requireSelf` / `requireSelfOrAdmin` / `requireAdmin`
   for user-record and admin endpoints
5. **Consistent error messages** - `ForbiddenError` for missing auth context,
   `NotFoundError` for resources outside the caller's scope
6. **Log with context** - Include `userId` in structured logs

### Security Benefits

- **Data isolation**: Users can only access their own resources
- **Authentication enforcement**: Services validate authentication requirements  
- **Consistent security**: Pattern applied across all user-owned modules
- **Audit trail**: Owner information logged for all operations

## Database Access Patterns

### Prefer Sequelize Methods
```typescript
// ✅ Use Sequelize methods
const article = await db.Article.findByPk(id);
const { count, rows } = await db.Article.findAndCountAll({ where, limit, offset });
const [updatedCount] = await db.Article.update(dto, { where: { id } });
const deletedCount = await db.Article.destroy({ where: { id } });
```

### Raw Queries (When Necessary)
Only use raw queries for complex operations:

**Create**: `src/queries/{entity}.queries.ts`
```typescript
// src/queries/article.queries.ts
import { QueryTypes } from 'sequelize';
import { db } from '@config/sequelize';

export class ArticleQueries {
  static getComplexAnalytics = async (): Promise<AnalyticsResult[]> => {
    const query = `
      SELECT 
        a.id,
        a.concept,
        COUNT(ei.id) as usage_count,
        AVG(ar.price) as avg_price
      FROM article a
      LEFT JOIN expense_item ei ON a.id = ei.article_id
      LEFT JOIN article_record ar ON a.id = ar.article_id
      WHERE a.is_enabled = true
      GROUP BY a.id, a.concept
      HAVING COUNT(ei.id) > 5
      ORDER BY usage_count DESC
    `;
    
    return db.sequelize.query(query, {
      type: QueryTypes.SELECT,
      raw: true,
    });
  };
}
```

### Timezone Handling in Date Queries

**IMPORTANT:** Always apply timezone conversion to date fields in queries to ensure data is grouped/filtered by Mexico City time, not UTC.

#### Raw SQL Queries
Use `AT TIME ZONE 'America/Mexico_City'` on date columns:

```typescript
export const queryExpensesByMonth = `
    SELECT
        to_char(date_trunc('month', e.expense_date AT TIME ZONE 'America/Mexico_City'), 'YYYY-MM') as month,
        SUM(e.total_amount) AS total
    FROM expense as e
    WHERE e.is_draft = false
      AND e.expense_date AT TIME ZONE 'America/Mexico_City' >= :startDate::date
      AND e.expense_date AT TIME ZONE 'America/Mexico_City' < (:endDate::date + interval '1 day')
    GROUP BY date_trunc('month', e.expense_date AT TIME ZONE 'America/Mexico_City')
    ORDER BY month;
`;
```

#### Sequelize Queries
Use `db.sequelize.literal()` with timezone conversion:

```typescript
const categoryExpenses = await db.ExpenseItem.findAll({
  include: [
    {
      model: db.Expense,
      as: 'expense',
      where: {
        isDraft: false,
        [Op.and]: [
          db.sequelize.where(
            db.sequelize.literal('"expense"."expense_date" AT TIME ZONE \'America/Mexico_City\''),
            {
              [Op.between]: [`${startDate} 00:00:00`, `${endDate} 23:59:59`],
            },
          ),
        ],
      },
    },
  ],
});
```

**Why this matters:**
- Database timestamps are stored in UTC
- Without timezone conversion, queries group/filter by UTC time, not Mexico City time
- This causes date misalignment: a transaction on 2024-02-18 23:00 UTC = 2024-02-18 17:00 Mexico City time
- Always convert to user's timezone before grouping or filtering on dates

### Transaction Pattern
Always wrap database operations in transactions. `withTransaction` is backed by
AsyncLocalStorage: nested `withTransaction` calls automatically REUSE the
surrounding transaction instead of opening a new one, so a service can call
another transactional service and everything commits or rolls back atomically
(see `src/utils/transaction.util.ts` and docs in transaction-pattern usage):

```typescript
create = async (dto: CreateArticleDto): Promise<ArticleDto> =>
  withTransaction(async (transaction: Transaction) => {
    const article = await db.Article.create(dto, { transaction });
    logger.info('Article created', { articleId: article.id });
    return this.toArticleDto(article);
  });
```

### ⛔ N+1 Query Anti-Pattern (NEVER DO THIS)

**NEVER execute database queries inside loops.** This creates N+1 query problems that destroy performance.

```typescript
// ❌ NEVER DO THIS - N+1 query problem
async getBadExample(): Promise<SomeDto[]> {
  const items = await db.Item.findAll();

  const results = [];
  for (const item of items) {
    // This executes a query for EACH item - terrible!
    const details = await db.Detail.findAll({ where: { itemId: item.id } });
    results.push({ ...item, details });
  }
  return results;
}

// ✅ CORRECT - Use includes/joins or batch queries
async getGoodExample(): Promise<SomeDto[]> {
  // Option 1: Use Sequelize includes
  const items = await db.Item.findAll({
    include: [{ model: db.Detail, as: 'details' }],
  });

  // Option 2: Batch query with IN clause
  const items = await db.Item.findAll();
  const itemIds = items.map(i => i.id);
  const allDetails = await db.Detail.findAll({
    where: { itemId: { [Op.in]: itemIds } }
  });
  // Then map details to items in memory

  return items;
}
```

**Why this matters:**
- 10 items = 11 queries, 100 items = 101 queries, 1000 items = 1001 queries
- Each query has network overhead, connection pool usage, and database load
- This scales linearly and will eventually crash your system

### ⛔ Await Inside Loops Anti-Pattern (NEVER DO THIS)

**NEVER use `await` inside `for` loops for database operations.** Use batch operations instead.

```typescript
// ❌ NEVER DO THIS - Sequential creates, one at a time
async createItems(items: CreateItemDto[]): Promise<void> {
  for (const item of items) {
    await db.Item.create(item, { transaction });  // Slow!
  }
}

// ✅ CORRECT - Use bulkCreate for batch insert
async createItems(items: CreateItemDto[]): Promise<void> {
  await db.Item.bulkCreate(items, { transaction });
}

// ✅ CORRECT - If you need created IDs, bulkCreate returns them
async createItemsWithIds(items: CreateItemDto[]): Promise<number[]> {
  const created = await db.Item.bulkCreate(items, { transaction });
  return created.map(item => item.id);
}

// ✅ CORRECT - For parallel independent queries, use Promise.all
const [payments, recipients] = await Promise.all([
  db.PaymentMethod.findOne({ where: { isActive: true } }),
  db.Recipient.findOne({ where: { isEnabled: true } }),
]);
```

### ⛔ Code Duplication Anti-Pattern (NEVER DO THIS)

**NEVER duplicate interfaces, DTOs, or mapping functions that already exist.** Reuse existing services.

```typescript
// ❌ NEVER DO THIS - Duplicating ExpenseDto mapping in another service
class SomeOtherService {
  // Don't create your own toExpenseDto!
  private toExpenseDto(expense: any): ExpenseDto {
    return { id: expense.id, /* ... same fields as ExpenseService */ };
  }
}

// ✅ CORRECT - Reuse the existing service
import ExpenseService from '@services/expense.service';

class SomeOtherService {
  async doSomethingWithExpense(id: number): Promise<ExpenseDto> {
    // After your operations, use ExpenseService to get the formatted DTO
    return ExpenseService.findById(id);
  }
}
```

**Rules:**
- If a DTO interface exists in `@interfaces/`, use it - don't recreate it
- If a service has a `toDto` or `findById` method, use it - don't duplicate the mapping
- If you need data from another entity, inject/import that entity's service

## Code Patterns & Best Practices

### Singleton Pattern
Export instances, not classes:

```typescript
// ✅ Services
class ArticleService {
  // Implementation
}
export default new ArticleService();

// ✅ Controllers  
class ArticleController {
  // Implementation
}
export default new ArticleController();
```

### Factory Pattern (Models)
```typescript
const ArticleFactory = (sequelize: Sequelize): ModelClass<ArticleInstance> => {
  ArticleInstance.init(
    { /* schema definition */ },
    { /* options */ }
  );
  
  ArticleInstance.associate = (models) => {
    // Define associations
  };
  
  return ArticleInstance as ModelClass<ArticleInstance>;
};

export default ArticleFactory;
```

### DTO Transformation
```typescript
private toArticleDto = (article: ArticleInstance): ArticleDto => ({
  id: article.id,
  concept: article.concept,
  brand: article.brand,
  category: article.category,
  isEnabled: article.isEnabled,
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
});
```

## Step-by-Step Module Creation

### Prerequisites: Authentication-Enabled Modules

For modules that handle user-owned resources, first ensure the Express Request interface extension exists:

**Create**: `src/interfaces/express.d.ts` (if not exists)

```typescript
import { JWTPayload } from '@interfaces/user.dto';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
```

### 1. Create Model (`src/models/{entity}.model.ts`)

For **User-Owned Resources** (accounts, expenses, etc.), include the owner relationship:

```typescript
import {
  Sequelize,
  DataTypes,
  CreationOptional,
  ForeignKey,
} from 'sequelize';
import { BaseModelInstance, ModelClass } from '@models/base.model';

export class ExampleInstance extends BaseModelInstance<ExampleInstance> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: CreationOptional<string>;
  declare isEnabled: CreationOptional<boolean>;
  declare ownerId: ForeignKey<string>; // ✅ For user-owned resources
  declare createdAt: CreationOptional<string>;
  declare updatedAt: CreationOptional<string>;
}

const ExampleFactory = (sequelize: Sequelize): ModelClass<ExampleInstance> => {
  ExampleInstance.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isEnabled: {
        field: 'is_enabled',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ownerId: {
        field: 'owner_id',
        type: DataTypes.UUID,
        allowNull: false, // ✅ Required for user-owned resources
      },
      createdAt: {
        field: 'created_at',
        type: DataTypes.DATE,
      },
      updatedAt: {
        field: 'updated_at',
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      tableName: 'example',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      modelName: 'Example',
    },
  );

  ExampleInstance.associate = (models) => {
    // ✅ Define owner relationship for user-owned resources
    ExampleInstance.belongsTo(models.User, { 
      as: 'owner', 
      foreignKey: 'owner_id' 
    });
  };

  return ExampleInstance as ModelClass<ExampleInstance>;
};

export default ExampleFactory;
```

### 2. Define DTOs (`src/interfaces/{entity}.dto.ts`)

```typescript
import { BaseFilterDto, BaseListDto } from './base.dto';

export interface CreateExampleDto {
  name: string;
  description?: string;
  isEnabled?: boolean;
}

export interface UpdateExampleDto {
  name?: string;
  description?: string;
  isEnabled?: boolean;
}

export interface ExampleDto {
  id: number;
  name: string;
  description?: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ExampleListDto = BaseListDto<ExampleDto>;

export interface ExampleFilterDto extends BaseFilterDto {
  isEnabled?: boolean;
}
```

### 3. Create Validation (`src/validations/{entity}.validation.ts`)

```typescript
import Joi from 'joi';
import { registerSchemas } from '@utils/validation.util';

const exampleValidationSchemas = {
  createExample: Joi.object({
    name: Joi.string()
      .required()
      .min(1)
      .max(255)
      .trim(),
    description: Joi.string()
      .allow(null, '')
      .max(1000)
      .trim(),
    isEnabled: Joi.boolean()
      .default(true),
  }),

  updateExample: Joi.object({
    name: Joi.string()
      .min(1)
      .max(255)
      .trim(),
    description: Joi.string()
      .allow(null, '')
      .max(1000)
      .trim(),
    isEnabled: Joi.boolean(),
  }).min(1),

  exampleFilter: Joi.object({
    searchText: Joi.string()
      .allow('')
      .max(100)
      .trim(),
    isEnabled: Joi.boolean(),
    offset: Joi.number()
      .integer()
      .min(0)
      .default(0),
    limit: Joi.number()
      .integer()
      .min(1)
      .default(50),
  }),
};

registerSchemas(exampleValidationSchemas);

export default exampleValidationSchemas;
```

### 4. Implement Service (`src/services/{entity}.service.ts`)

For **User-Owned Resources**, include authentication validation:

```typescript
import { Transaction, Op } from 'sequelize';
import withTransaction from '@utils/transaction.util';
import { logger } from '@config/logger';
import { db } from '@config/sequelize';
import {
  CreateExampleDto,
  UpdateExampleDto,
  ExampleDto,
  ExampleListDto,
  ExampleFilterDto,
} from '@interfaces/example.dto';
import { WhereClause } from '@interfaces/base.dto';
import { ExampleInstance } from '@models/example.model';
import { NotFoundError, BusinessRuleError, ForbiddenError } from '@errors/app-error';

class ExampleService {
  /**
   * Creates a new example for the authenticated user
   * @param dto - The data transfer object containing example creation details
   * @param ownerId - ID of authenticated user (validated by the controller via requireUserId)
   * @returns Promise resolving to the created example DTO
   */
  create = async (dto: CreateExampleDto, ownerId: string): Promise<ExampleDto> => {
    return withTransaction(async (transaction: Transaction) => {
      const example = await db.Example.create({
        ...dto,
        ownerId, // ✅ Associate with authenticated user
      }, { transaction });

      logger.info('Example created', { exampleId: example.id, ownerId });

      return this.toExampleDto(example);
    });

  /**
   * Updates an existing example's information.
   * @param id - The unique identifier of the example to update
   * @param dto - The data transfer object containing fields to update
   * @returns Promise resolving to the updated example DTO
   * @throws NotFoundError if the example is not found
   */
  update = async (id: number, dto: UpdateExampleDto): Promise<ExampleDto> =>
    withTransaction(async (transaction) => {
      const [updatedCount, [updatedExample]] = await db.Example.update(dto, {
        where: { id },
        returning: true,
        transaction,
      });

      if (updatedCount === 0 || !updatedExample) {
        throw new NotFoundError('Example', id);
      }

      logger.info('Example updated', { exampleId: id });

      return this.toExampleDto(updatedExample);
    });

  /**
   * Deletes an example from the system.
   * @param id - The unique identifier of the example to delete
   * @returns Promise resolving when the deletion is complete
   * @throws NotFoundError if the example is not found
   */
  delete = async (id: number): Promise<void> =>
    withTransaction(async (transaction) => {
      const deletedCount = await db.Example.destroy({
        where: { id },
        transaction,
      });

      if (deletedCount === 0) {
        throw new NotFoundError('Example', id);
      }

      logger.info('Example deleted', { exampleId: id });
    });

  /**
   * Retrieves an example by its unique identifier.
   * @param id - The unique identifier of the example
   * @returns Promise resolving to the example DTO
   * @throws NotFoundError if the example is not found
   */
  findById = async (id: number): Promise<ExampleDto> => {
    const example = await db.Example.findByPk(id);

    if (!example) {
      throw new NotFoundError('Example', id);
    }

    return this.toExampleDto(example);
  };

  /**
   * Retrieves a paginated list of examples for the authenticated user
   * @param filters - Filter parameters including search text and pagination
   * @param ownerId - ID of authenticated user (validated by the controller via requireUserId)
   * @returns Promise resolving to a list of user's examples with total count
   */
  findAll = async (filters: ExampleFilterDto, ownerId: string): Promise<ExampleListDto> => {
    const { searchText, isEnabled, offset = 0, limit = 50 } = filters;
    const where: WhereClause = { 
      ownerId, // ✅ Filter by authenticated user only
    };

    if (typeof isEnabled === 'boolean') {
      where.isEnabled = isEnabled;
    }

    if (searchText) {
      where[Op.or as symbol] = [
        { name: { [Op.iLike]: `%${searchText}%` } },
        { description: { [Op.iLike]: `%${searchText}%` } },
      ];
    }

    const { count, rows } = await db.Example.findAndCountAll({
      where,
      limit,
      offset,
      order: [['is_enabled', 'DESC'], ['name', 'ASC']],
      distinct: true,
    });

    return {
      rows: rows.map((row) => this.toExampleDto(row)),
      count: +count,
    };
  };

  private toExampleDto = (example: ExampleInstance): ExampleDto => ({
    id: example.id,
    name: example.name,
    description: example.description,
    isEnabled: example.isEnabled,
    createdAt: example.createdAt,
    updatedAt: example.updatedAt,
  });
}

export default new ExampleService();
```

### 5. Create Controller (`src/controllers/{entity}.controller.ts`)

For **User-Owned Resources**, controllers pass authentication context to services:

```typescript
import { Request, Response, NextFunction } from 'express';
import ExampleService from '@services/example.service';
import { validateDto } from '@utils/validation.util';
import {
  CreateExampleDto,
  UpdateExampleDto,
  ExampleFilterDto,
} from '@interfaces/example.dto';
import { EntityIdParamsDto } from '@interfaces/base.dto';

class ExampleController {
  private exampleService: typeof ExampleService;

  constructor() {
    this.exampleService = ExampleService;
  }

  /**
   * Creates a new example for the authenticated user
   * @param req - Express request object containing example data in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns Created example with 201 status
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<CreateExampleDto>('createExample', req.body);
      
      // ✅ Pass user ID from auth context - service validates it
      const example = await this.exampleService.create(dto, req.user?.id);

      return res.status(201).json(example);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Updates an existing example
   * @param req - Express request object containing example ID in params and update data in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns Updated example data
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityIdParamsDto>('entityId', req.params);
      const dto = validateDto<UpdateExampleDto>('updateExample', req.body);

      const example = await this.exampleService.update(id, dto);

      return res.json(example);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Deletes an example by ID
   * @param req - Express request object containing example ID in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns 204 No Content status
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityIdParamsDto>('entityId', req.params);
      await this.exampleService.delete(id);

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Retrieves an example by ID
   * @param req - Express request object containing example ID in params
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns Example data
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityIdParamsDto>('entityId', req.params);
      const example = await this.exampleService.findById(id);
      return res.json(example);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Lists user's examples with optional filtering
   * @param req - Express request object containing filter parameters in query
   * @param res - Express response object
   * @param next - Express next function for error handling
   * @returns Paginated list of user's examples matching filters
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filters = validateDto<ExampleFilterDto>('exampleFilter', req.query);
      
      // ✅ Pass user ID for filtering user's resources only
      const result = await this.exampleService.findAll(filters, req.user?.id);

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };
}

export default new ExampleController();
```

### 6. Setup Routes (`src/routes/{entity}.route.ts`)

```typescript
import { Router } from 'express';
import exampleController from '@controllers/example.controller';
import Auth from '@middlewares/auth';
import '@validations/example.validation';

export class ExampleRoute {
  public canAccess = new Auth().checkAuth;
  public router: Router = Router();

  public constructor() {
    this.init();
  }

  private init(): void {
    this.router.route('/examples')
      .all(this.canAccess)
      .get(exampleController.list)
      .post(exampleController.create);

    this.router.route('/examples/:id')
      .all(this.canAccess)
      .get(exampleController.getById)
      .put(exampleController.update)
      .delete(exampleController.delete);
  }
}

export default new ExampleRoute().router;
```

### 7. Register Model in Sequelize Config

Add to `src/config/sequelize.ts`:

```typescript
import ExampleFactory from '@models/example.model';

// In initDataBase method:
db.Example = ExampleFactory(sequelize);
```

### 8. Update DB Models Interface

Add to `src/interfaces/sequelize.interface.ts`:

```typescript
import { ExampleInstance } from '@models/example.model';

export interface DbModels {
  // ... existing models
  Example: ModelStatic;
  // ...
}
```

## Common Utilities

### Transaction Utility
```typescript
import withTransaction from '@utils/transaction.util';

// Wrap all write operations
create = async (dto: CreateDto): Promise<Dto> =>
  withTransaction(async (transaction) => {
    // Database operations
  });
```

### Validation Utility
```typescript
import { validateDto } from '@utils/validation.util';

// Type-safe validation
const dto = validateDto<CreateExampleDto>('createExample', req.body);
```

### Logger
```typescript
import { logger } from '@config/logger';

// Use structured logging
logger.info('Operation completed', { entityId: id, operation: 'create' });
logger.error('Operation failed', { error: error.message, entityId: id });
```

### Error Classes
```typescript
import { NotFoundError, BusinessRuleError, ConflictError } from '@errors/app-error';

// Throw appropriate errors
throw new NotFoundError('Entity', id);
throw new BusinessRuleError('Cannot perform operation: business rule violated');
throw new ConflictError('Entity already exists');
```

## Best Practices Checklist

### Core Module Structure
- [ ] Model extends `BaseModelInstance<T>`
- [ ] Factory pattern for models
- [ ] Singleton pattern for services/controllers
- [ ] Services throw errors, controllers catch and pass to `next`
- [ ] Use `withTransaction` for database operations
- [ ] Prefer Sequelize methods over raw queries
- [ ] Use destructuring for variable assignments
- [ ] Never use `any` type
- [ ] Explicit return types on all functions
- [ ] Comments only for complex logic (not simple CRUD)
- [ ] Consistent CRUD method naming
- [ ] Type-safe validation with `validateDto<T>`
- [ ] Use `validateDto` for ALL request inputs (`req.params`, `req.query`, `req.body`)
- [ ] Use shared `entityId`/`entityUuid` schemas for route params
- [ ] Never use manual casts (`+req.params.id`, `as string`, `req.body as { type }`)
- [ ] Never use `import type` — always use regular `import`
- [ ] Structured logging with context
- [ ] Use custom error classes
- [ ] Auto-registration of routes
- [ ] Import validation schema in route file

### Authentication Context (User-Owned Resources)
- [ ] Express Request interface extended (`src/interfaces/express.d.ts`)
- [ ] Model includes `ownerId`/`userId` field with User association
- [ ] Controllers resolve the user with `requireUserId(req.user?.id)`
- [ ] Services take a required `userId: string` parameter
- [ ] Database queries AND writes filter by owner (`where: { id, userId }`)
- [ ] Update/delete affected-row counts verified; `NotFoundError` on mismatch
- [ ] `requireSelf`/`requireSelfOrAdmin`/`requireAdmin` used where applicable
- [ ] Owner context included in structured logs

## Additional Modules (not covered in depth here)

Newer subsystems that follow the same 6-layer patterns; read the source before
touching them:

- **Gemini OCR / receipt scanning** — `src/services/gemini-vision.service.ts`
  (image + free-text extraction via `@google/genai`), staged through
  `receipt-draft.service.ts` and confirmed into real expenses.
- **API keys** — `src/services/api-key.service.ts` +
  `src/middlewares/api-key-auth.middleware.ts`. Revocable, scoped,
  SHA-256-hashed keys sent as `X-API-Key`; `npm run apikey` CLI.
- **Rate limiting** — `src/middlewares/rate-limit.middleware.ts`
  (express-rate-limit; global API limiter + strict auth limiter; disabled in
  tests).
- **Email** — `src/services/email.service.ts` (Resend) for verification and
  password-reset flows backed by Redis tokens.
- **Partnership / Family Mode** — 5 models + `src/queries/partnership.queries.ts`;
  2-member household sharing with exclusion-based item sharing.
- **Account ledger** — `src/services/account-ledger.service.ts`. The ledger is
  the source of truth for balances: `account.currentAmount` is overwritten with
  the running ledger balance on every transaction, and accounts get their
  opening balance as a ledger entry ("Saldo inicial") at creation.

## Conclusion

This guide ensures consistency, maintainability, and type safety across all modules. Follow these patterns when creating new modules or refactoring existing ones.

For complex queries, create dedicated query files in `src/queries/{entity}.queries.ts`. Always prioritize Sequelize methods and only use raw queries when absolutely necessary for complex operations.

Remember: **Services handle business logic and throw errors. Controllers handle HTTP and pass errors to middleware.**
