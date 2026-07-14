# Logging & Grafana Loki

How nabani-api logs are produced, shipped, and queried.

## Architecture

```
winston (stdout, one JSON object per line)
  → journald (systemd unit: nabani-api.service)
    → Grafana Alloy (loki.source.journal + parse stages, deploy/alloy-config.alloy)
      → Loki (http://loki:3100, docker network) → Grafana
```

The app **never pushes to Loki directly** (no `winston-loki`). Writing JSON to
stdout and letting an agent ship it keeps the app decoupled from Loki
availability, avoids in-process batching/retry/memory concerns, and survives
Loki outages (logs buffer in journald).

## Log line contract (production/stage)

One flat JSON object per line — no nesting under `metadata`, so LogQL reads
naturally (`| json | userId="42"`).

| Field | Source | Notes |
|---|---|---|
| `timestamp` | winston | RFC3339 UTC with ms, e.g. `2026-07-14T18:04:11.123Z` |
| `level` | winston | `error` `warn` `info` `http` `verbose` `debug` |
| `message` | call site | human-readable summary |
| `service` | static | `nabani-api` |
| `env` | config | `production` / `stage` |
| `version` | package.json | correlate errors with deploys |
| `requestId` | AsyncLocalStorage | injected on every line inside a request |
| `userId` | AsyncLocalStorage | injected after auth (JWT or API key) |
| `apiKeyId` | AsyncLocalStorage | API-key requests only |
| `error` | meta | `{ name, message, stack }` — Error instances are auto-serialized |
| …meta | call site | whatever the call passes (`deliveryId`, `status`, `durationMs`, …) stays top-level |

Access logs (`level=http`, one per completed request) additionally carry
`method`, `url`, `status`, `durationMs`, `bytes`, and `aborted: true` when the
client disconnected first.

In development the format stays human-readable/colorized; the contract above
applies to `production`/`stage` only.

## Levels

Default level per env (override with `LOG_LEVEL`):

| Env | Default | Rationale |
|---|---|---|
| production / stage | `http` | access logs flow to Loki; `debug` (route-not-found probes, token expiry) stays out |
| development | `debug` | everything visible locally |
| test | `warn` | quiet integration runs |

Set `LOG_LEVEL=info` in `~/secrets/.env.nabani` to silence access logs without
touching application logs.

## Request correlation

- `src/middlewares/request-context.middleware.ts` opens an AsyncLocalStorage
  scope per request: accepts a well-formed incoming `X-Request-Id` header or
  generates a UUID, and echoes it back on the response.
- The winston format injects `requestId`/`userId` into **every** log line
  emitted inside that scope — services never pass them manually.
- Error responses include `error.requestId`, so a screenshot from the frontend
  is enough to pull the full server-side trace.

## Shipping (droplet)

Alloy pipeline: see [`deploy/alloy-config.alloy`](../deploy/alloy-config.alloy) —
**merge its `loki.process` stages into the live `/etc/alloy/config.alloy`**
(which already has a journal source and a `loki.write`; duplicating component
names, or adding a second journal source for the same unit, breaks/duplicates
ingestion). This is a manual droplet step + `systemctl restart alloy`,
independent of merging the PR.

Labels are intentionally minimal — `unit` (from journald) plus `app`, `env`,
`level` promoted from the JSON line. Everything else is queried from the line
with `| json`; never promote high-cardinality fields (requestId, userId, url)
to labels.

Retention/rotation is journald's job — check
`journalctl -u nabani-api --disk-usage` and cap it in
`/etc/systemd/journald.conf` (`SystemMaxUse=`). Live tail without Grafana:

```bash
journalctl -u nabani-api -f -o cat
```

## LogQL cookbook

`{app="nabani-api"}` relies on the promoted `app` label from
`deploy/alloy-config.alloy`; until that ships (and for raw non-JSON crash
lines, which skip the parsed labels) use `{unit="nabani-api.service"}` instead.

```logql
# All errors in prod
{app="nabani-api", env="production", level="error"}

# Full trace of one request (from an error response's requestId)
{app="nabani-api"} | json | requestId="d3f0…"

# Everything one user did
{app="nabani-api"} | json | userId="42"

# 5xx responses
{app="nabani-api", level="http"} | json | status >= 500

# p95 latency, 5m windows
quantile_over_time(0.95,
  {app="nabani-api", env="production", level="http"}
    | json | unwrap durationMs [5m])

# Error rate (alerts / dashboard stat)
sum(rate({app="nabani-api", env="production", level="error"}[5m]))

# Requests per endpoint
sum by (url) (count_over_time(
  {app="nabani-api", level="http"} | json [15m]))
```
