<h1 align="center">Nabani — Backend</h1>

<p align="center">
  Operations API for <strong>Nabani</strong>, the internal app of a nutrition clinic +
  healthy meal‑prep (tupper) delivery business in Oaxaca, México.<br/>
  Node 24 · TypeScript · Express 5 · Sequelize 6 · PostgreSQL · Redis. UI language: <strong>es‑MX</strong>.
</p>

---

## What this is (and how it got here)

Nabani is the full‑stack modernization of the legacy **Nutrivera / "Mi plan"** app. This backend
was built as a **three‑way merge**:

- **Architecture / infra** — forked from **Maguey** (`../maguey/maguey-backend`, a modern TS/Express
  finance API). Kept: auth (JWT + Redis refresh + email verify/reset), API‑key system, Joi validation
  registry, error hierarchy, transactions, logger, route auto‑loader, base model, test harness, `User`.
- **Domain model + business logic** — from the legacy Nutrivera schema (patients, menus, ingredients,
  dishes, packages, sales, payments, deliveries, staff, expenses), re‑modeled fresh in Sequelize 6.
- **Design/UX contract** — the Nabani "Agave" design handoff (drives the frontend; see that repo).

> **📖 Deep reference lives in `docs/nabani-planning/`** — read these when picking up work:
> `00-MASTER-CONTEXT.md` (unified data model §4, RBAC §8, business logic §5),
> `10-backend-domain-spec.md` (the 25‑table build contract + conventions),
> `02-legacy-backend.md` (the original algorithms), `04-maguey-backend.md` (the base architecture).
> The repo also ships `docs/MODULE_DEVELOPMENT_GUIDE.md` (Maguey's 6‑layer + add‑a‑resource guide).

## Tech stack

| | |
|---|---|
| Runtime | Node **24+**, npm 11+ |
| Language | TypeScript 6 (strict, `nodenext`, path aliases via `tsc-alias`) |
| HTTP | Express 5 (`express-rate-limit`, helmet, cors, compression) |
| ORM / DB | Sequelize 6 · PostgreSQL 16 (`uuid-ossp`) |
| Cache/tokens | Redis (node-redis) — refresh tokens, email/reset tokens |
| Auth | JWT (15 min) + hashed rotating refresh tokens + bcrypt; scoped API keys (`mgk_live_*`) |
| Validation | Joi 18 (schema registry → `validateDto('name', data)`) |
| Email | Resend (no‑ops when `RESEND_API_KEY` empty) |
| Docs | swagger-jsdoc at `/api-docs` (dev only) |
| Tests | Jest — unit (mock service) + integration (supertest + real PG/Redis) |

## Prerequisites

- Node 24+, npm 11+
- **PostgreSQL** reachable at `localhost:5432` (or via `docker-compose up -d postgres`)
- **Redis** at `localhost:6379` (or `docker-compose up -d redis`)

## Setup (fresh machine)

```sh
# 1. Install
npm install

# 2. Databases (once) — needs the uuid-ossp extension
psql -h localhost -U postgres -c "CREATE DATABASE nabani;"
psql -h localhost -U postgres -c "CREATE DATABASE nabani_test;"
psql -h localhost -U postgres -d nabani      -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
psql -h localhost -U postgres -d nabani_test -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

# 3. Environment  (.env is gitignored — create it)
cp .env.example .env
#   set SQL_PASSWORD + JWT_SECRET.  Defaults: PORT=5333, SQL_DB=nabani,
#   FRONTEND_URL=http://localhost:5332 (must match where the frontend serves — for CORS)

# 4. Boot — sync() creates all 28 tables from the models on first run
npm run dev            # → http://localhost:5333 , swagger at /api-docs

# 5. Seed reference catalogs (idempotent: 16 diseases + 5 calorie levels)
NODE_ENV=development npx tsx src/scripts/seed.ts

# 6. Create a dev admin (register, then verify + grant the admin role)
curl -s -X POST http://localhost:5333/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"admin@nabani.app","email":"admin@nabani.app","password":"nabani123","displayName":"Administrador"}'
psql -h localhost -U postgres -d nabani -c \
  "UPDATE \"user\" SET email_verified=true, roles='[\"admin\"]', fullname='Administrador' WHERE username='admin@nabani.app';"

# 7. (optional) Rich demo data — drives the WHOLE flujo maestro via the API
#    (ingredients, dishes w/ per-level portions, packages, 6 patients, sales+deliveries, menu applied)
python3 scripts/seed-demo.py
```

**Dev admin:** `admin@nabani.app` / `nabani123`.

## Schema: `sync()` vs migrations (read this)

**Models are the source of truth**: `sequelize.sync()` at boot creates any missing table, in dev and
prod alike (a failed sync exits the process in prod/stage so the deploy health check catches it).
`db-migrations/migrations/` holds only **incremental changes sync can't do** — extensions, ALTERs of
existing tables, data backfills. The deploy runs `db:migrate` before restarting the app, so future
migrations ship automatically; today the only one is the `uuid-ossp` extension (needed before sync,
since every PK defaults to `uuid_generate_v4()`). Do **not** write create-table migrations for new
models — sync handles those. `db-migrations/config/config.js` reads DB creds from env (no committed
secrets).

## Architecture — strict 6‑layer flow

```
route → (JWT/role middleware) → controller (thin) → service (all logic + db.*) → model → PostgreSQL
```
- **Controllers** are thin: `validateDto('name', req…)` → call service → `res.json`. No DB access.
- **Services** are singletons holding all business logic + `db.*`; `withTransaction()` for writes;
  throw typed `AppError`s; private `toXDto` mappers coerce DECIMAL with `+value`.
- **Clinic‑wide access** — data is shared across staff and gated by **role**, NOT owned per‑user.
  Do **not** add `ownerId` scoping to clinical queries. Patients carry a `nutriologaId`.

```
src/
├── config/        sequelize.ts (registers every model), express.ts, redis, logger, swagger, config (env+Joi)
├── models/        Sequelize 6 class factories (base.model.ts; ingredient.model.ts = template)
├── interfaces/    DTOs + sequelize.interface.ts (DbModels), roles.ts, express.d.ts
├── validations/   Joi schemas → registerSchemas(); shared.validation.ts (entityUuid/entityId)
├── services/      business logic (CRUD + the flujo-maestro orchestrators)
├── controllers/   thin HTTP handlers
├── routes/        one *.route.ts per resource — AUTO-LOADED, mounted under /api
├── queries/       raw SQL for aggregations (production/dashboard/report)
├── middlewares/   auth (JWT), api-key-auth, role.middleware (requireRole), rate-limit
├── errors/ utils/ AppError hierarchy; validateDto, withTransaction, user-context guards
└── scripts/       api-key.ts (CLI), seed.ts
db-migrations/     sequelize-cli migrations/, config/config.js (env-based), models/
```

## Domain (28 tables)

- **Identity:** `user`, `user_config`, `api_keys`.
- **Catalog:** `disease`, `calorie_level`, `ingredient`, `ingredient_disease` (No‑apto‑para).
- **Menus:** `dish`, `dish_ingredient`, `dish_ingredient_portion` (per‑kcal‑level portions),
  `menu_day`, `menu_day_meal`.
- **Patients:** `patient`, `patient_address`, `nutrition_plan`, `patient_disease`, `patient_preference`,
  `consultation`.
- **Sales/delivery:** `package`, `sale`, `sale_item`, `payment`, `delivery_day`, `delivery_meal`,
  `delivery_meal_ingredient`.
- **Finance/staff:** `beneficiary`, `expense`, `employee`.

**Business logic (the "flujo maestro diario", in `services/*`):** `POST /sales/calculate-package-and-days`
(LD/LV/LS day generation, discount precedence, installment chunking, Sale→Payments→DeliveryDays txn) ·
`POST /apply-menu-to-patients` (resolves the day's menu per patient at their kcal level + package meals,
flags preference=amber / disease=blue conflicts) · `/adjustments` (queue, swap‑suggestions, swap,
eliminate) · `POST /authorize` · production reads `/production-map` `/delivery-labels` `/kitchen-view`
`/shopping-list` · `/dashboard/{today,attention,week}` · reports `/daily-incomes` `/revenue-by-day`
`/balance` `/incomes-by-package` `/expenses-by-type`. Full contract in `docs/nabani-planning/`.

## Auth & roles

JWT via `Auth.checkAuth`; role gate via `requireRole(...)` after it. Roles (`src/interfaces/roles.ts`):
`admin`, `nutriologa` (no Finanzas/Catálogos), `cocina` (read Vista cocina), `front_desk`, `reparto`,
`paciente` (portal). RBAC matrix in `00-MASTER-CONTEXT.md §8`. API keys: `npm run apikey -- --help`.

## Add a resource (9 steps)

Copy the **Group‑A template** (`src/{models,interfaces,validations,services,controllers,routes}/ingredient*`
+ `disease*` / `calorie-level*`): model → DTO → validation → service → controller → route (auto‑loaded)
→ **register the model in `config/sequelize.ts` AND `interfaces/sequelize.interface.ts` (DbModels)** →
tests (sync creates the table; no migration needed). Details in `10-backend-domain-spec.md` and `docs/MODULE_DEVELOPMENT_GUIDE.md`.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | dev server + hot reload (`tsx watch`), :5333 |
| `npm run build` | `tsc && tsc-alias` → `release/` |
| `npm run test:unit` / `test:integration` / `test:all` | Jest (integration needs `nabani_test` DB + Redis) |
| `npm run lint` | ESLint |
| `npm run db:migrate` / `db:seed` | sequelize-cli |
| `npm run apikey -- …` | manage API keys |
| `npx tsx src/scripts/seed.ts` | seed catalogs (idempotent) |
| `python3 scripts/seed-demo.py` | seed full demo data via the API (needs server + admin) |

## Deployment

CI/CD to a DigitalOcean droplet (pm2) via GitHub Actions. On push to `master` (or manual
`workflow_dispatch`), `.github/workflows/main.yml`:

1. **build** — `npm ci` → `npm run deploy:prod` (compiles to `release/`, assembles a `backend/` folder
   = `src` + `db-migrations` + `package.json` + `.sequelizerc`) → `npm prune --omit=dev` → move the
   pruned prod `node_modules` into `backend/` → `tar -czf backend.tar.gz backend` → upload artifact.
2. **deploy** — `scp` the tarball to `/home/ellebkey/apps/nabani`, then SSH and run `~/nabani-backend`
   (the droplet's copy of `deploy/nabani-backend.sh`).

`deploy/nabani-backend.sh` swaps the release (keeping the previous as `backend.old`), copies the secret
env (`~/secrets/.env.nabani` → `backend/.env`; migrations read DB creds from it via
`db-migrations/config/config.js`), runs `sequelize-cli db:migrate`, `pm2 restart nabani-backend`, then
**health-checks `GET /api/health-check`** — failing the pipeline (and leaving `backend.old` untouched)
if the app doesn't come back.

- **Server layout:** `/home/ellebkey/apps/nabani/{backend,frontend}`.
- **After editing the deploy script, copy it to the droplet:** `scp deploy/nabani-backend.sh <user>@<host>:~/nabani-backend`.
- **GitHub secrets:** `HOST`, `USERNAME`, `PASSWORD`, `PORT`, `GITHUB_USERNAME`, `GITHUB_TOKEN`.
- **Droplet prereqs:** nvm (node 24), pm2 with an app named `nabani-backend` started once, and
  `~/secrets/.env.nabani` (PORT, SQL_*, JWT_SECRET, FRONTEND_URL, RESEND_*).

## Status

- ✅ **Phase 1 complete** — 28‑table domain + full flujo‑maestro business logic; boots, tsc‑clean, all
  endpoints 200, validated end‑to‑end with `scripts/seed-demo.py`.
- ⏳ **Remaining:** author `user`/`user_config`/`api_keys` migrations (dev uses sync); clean ~38
  pre‑existing ESLint warnings in the Group‑D files; **legacy Postgres → new‑schema ETL** (to load the
  real ~380 patients + history); broaden unit/integration test coverage.

## Troubleshooting

- **Port 5333 busy / stale server:** `fuser -k 5333/tcp`. (`kill <pid>` on an `npx` wrapper misses the
  node child — use `fuser` or `pkill -f "tsx.*src/index.ts"`.)
- **Frontend can't reach API / CORS blocked:** CORS is pinned to `FRONTEND_URL`. Serve the frontend at
  exactly that origin (`http://localhost:5332`, **not** `127.0.0.1`).
- **`RESEND_API_KEY is not allowed to be empty`:** already handled (schema allows `''`); leave it empty
  for local — email verification is bypassed by the admin‑seed SQL above.

Commit prefixes: `feat:` `fix:` `refactor:` `chore:`.
