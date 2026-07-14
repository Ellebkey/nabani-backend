import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createLogger, format, transports } from 'winston';

import envConfig from './config';
import { getRequestContext } from './request-context';

const { combine, timestamp, printf, json, colorize, splat, errors } = format;

const SERVICE_NAME = 'nabani-api';

// Read once at boot; resolves to <project root>/package.json both in dev
// (src/config) and in the deployed release layout (backend/src/config).
const serviceVersion = ((): string => {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
})();

/**
 * Stamp every line with the active request context (see request-context.ts).
 * Explicitly passed meta always wins over the injected values.
 */
const injectRequestContext = format((info) => {
  const ctx = getRequestContext();
  if (!ctx) {
    return info;
  }
  return {
    ...info,
    ...(info.requestId === undefined && { requestId: ctx.requestId }),
    ...(info.userId === undefined && ctx.userId !== undefined && { userId: ctx.userId }),
    ...(info.apiKeyId === undefined && ctx.apiKeyId !== undefined && { apiKeyId: ctx.apiKeyId }),
  };
});

/**
 * Error instances passed inside meta (e.g. `logger.warn('...', { error })`)
 * stringify to `{}` — replace them with plain serializable objects so the
 * message and stack survive into the JSON line.
 */
const serializeMetaErrors = format((info) => {
  const serialized: Record<string, unknown> = {};
  for (const key of Object.keys(info)) {
    const value = info[key];
    if (value instanceof Error) {
      serialized[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
  }
  if (Object.keys(serialized).length === 0) {
    return info;
  }
  return Object.assign({}, info, serialized);
});

// Development format — human readable, colorized, context fields appended as JSON
const devFormat = combine(
  colorize({
    all: false,
    colors: {
      http: 'magenta', info: 'green', error: 'red', verbose: 'blue',
    },
  }),
  splat(),
  errors({ stack: true }),
  injectRequestContext(),
  serializeMetaErrors(),
  timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  printf((info) => {
    let output = `${info.timestamp as string} [${SERVICE_NAME}] ${info.level}: ${info.message as string}`;

    // Append remaining meta, hiding the line's own parts and the static base fields
    const meta: Record<string, unknown> = {};
    for (const key of Object.keys(info)) {
      if (!['timestamp', 'level', 'message', 'stack', 'service', 'env', 'version'].includes(key)) {
        meta[key] = info[key];
      }
    }

    if (Object.keys(meta).length > 0) {
      output += ` ${JSON.stringify(meta)}`;
    }

    if (info.stack) {
      output += `\n${info.stack as string}`;
    }

    return output;
  }),
);

// Production/stage format — one flat JSON object per line, ready for Loki.
// Fields stay top-level (no `metadata` nesting) so LogQL reads naturally:
//   {app="nabani-api"} | json | userId="42"
// `timestamp()` emits RFC3339 UTC (2026-07-14T18:04:11.123Z), which the
// Alloy/Promtail timestamp stage parses natively (see docs/LOGGING.md).
const structuredFormat = combine(
  splat(),
  errors({ stack: true }),
  injectRequestContext(),
  serializeMetaErrors(),
  timestamp(),
  json(),
);

const isStructuredEnv = envConfig.env === 'production' || envConfig.env === 'stage';

// Level defaults per env, overridable with LOG_LEVEL:
//   production/stage: 'http' — access logs flow to Loki; debug is reserved for
//     routine noise (route-not-found probes, token expiry) and stays out.
//   test: 'warn' — keep integration test output quiet.
//   development: 'debug' — noise is visible while working locally.
const defaultLevel = ((): string => {
  if (isStructuredEnv) {
    return 'http';
  }
  return envConfig.env === 'test' ? 'warn' : 'debug';
})();

export const logger = createLogger({
  level: envConfig.logLevel || defaultLevel,
  defaultMeta: { service: SERVICE_NAME, env: envConfig.env, version: serviceVersion },
  format: isStructuredEnv ? structuredFormat : devFormat,
  transports: [new transports.Console()],
});
