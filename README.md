<p align="center">
  <img src="./maguey-banner.png" alt="Maguey" width="400">
</p>

<h1 align="center">Maguey - Backend</h1>

<p align="center">
  API server for <strong>Maguey</strong>, a personal finance tracking application.<br/>
  Built with TypeScript, Express, PostgreSQL, and Redis.
</p>

---

## Features

- **TypeScript** — Static typing and modern JavaScript features
- **Express** — Fast, minimalist web framework for Node.js
- **PostgreSQL** — Relational database via Sequelize ORM
- **Redis** — Caching layer for improved performance
- **JWT Auth** — Token-based authentication with BCrypt password hashing
- **API Keys** — Revocable, scoped keys for external / server-to-server integrations
- **Multi-user** — Full user isolation with scoped data access
- **OCR** — Receipt scanning via Google Gemini (`@google/genai`)
- **Swagger** — Auto-generated API documentation
- **Winston** — Structured logging

## Prerequisites

- [Node.js](https://nodejs.org/) v24+ (LTS)
- [Docker](https://www.docker.com/) (for PostgreSQL and Redis)

## Quick Start

### 1. Clone the repository
```sh
git clone https://github.com/username/myexpenses-backend.git
cd myexpenses-backend
```

### 2. Configure environment
```sh
cp .env.example .env
# Edit .env — set SQL_PASSWORD and JWT_SECRET at minimum
```

### 3. Start infrastructure (PostgreSQL + Redis)
```sh
docker-compose up -d
```

### 4. Install dependencies
```sh
npm install
```

### 5. Run database migrations
```sh
cd db-migrations
npx sequelize-cli db:migrate
cd ..
```

### 6. Start the development server
```sh
npm run dev
```

The API will be available at `http://localhost:4040`.
Swagger docs: `http://localhost:4040/api-docs`.

## Infrastructure

PostgreSQL and Redis run in Docker containers with ports exposed to the host, so the app connects to `localhost:5432` and `localhost:6379` — no special configuration needed.

```sh
docker-compose up -d      # start containers in background
docker-compose down       # stop containers (data is persisted in named volumes)
docker-compose ps         # check container status
```

## API Keys

External integrations can call the API programmatically with a revocable,
scoped **API key** sent as `X-API-Key: <key>` — no username/password login. Keys
act on behalf of a real user and only the SHA-256 hash is stored. Currently the
`drafts:write` scope opens two endpoints that stage a `receipt_drafts`:

- `POST /api/receipt-drafts/scan` — a receipt **photo** (multipart, field `receipt`) → Gemini → draft.
- `POST /api/receipt-drafts/from-text` — free **text** (`{ "text": "…" }`) → same Gemini schema → draft.

Both also accept a first-party JWT (premium/admin) unchanged. Generate a key
with `npm run apikey -- generate --user <id> --label "…" --scopes drafts:write`.
Run `npm run apikey -- --help` for all key-management commands.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Jest |
| `npm run apikey` | Generate / list / revoke / rotate API keys |

## Project Structure

```
src/
├── config/         # Sequelize, Redis, and app configuration
├── controllers/    # Request handlers (catch errors, call services)
├── middlewares/     # Auth, validation, error handling
├── models/         # Sequelize model factories
├── routes/         # Express route definitions (auto-loaded)
├── services/       # Business logic
├── validations/    # Joi schemas
├── interfaces/     # TypeScript DTOs and interfaces
└── utils/          # Shared helpers (transactions, logging, etc.)

db-migrations/
├── migrations/     # sequelize-cli migrations (up/down)
└── manual-scripts/ # One-off SQL scripts
```

## Tech Stack

| Technology | Version |
|------------|---------|
| Node.js | 24+ (LTS) |
| TypeScript | 6.0.3 |
| Express | 5.2+ |
| Sequelize | 6.37+ |
| PostgreSQL | 16 |
| Redis (node-redis) | 6.1 |
| Google Gemini (@google/genai) | 2.8+ |

## Development

Branch from `master` and open a PR for review. Commit prefixes: `feat:`, `fix:`, `refactor:`.
