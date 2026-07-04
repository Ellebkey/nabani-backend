import _ from 'lodash';
import { Request, Response } from 'express';
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, label, printf, json, colorize, splat, errors, metadata } = format;

// Development format - human readable with metadata
const devFormat = combine(
  colorize({
    all: false,
    colors: {
      http: 'magenta', info: 'green', error: 'red', verbose: 'blue',
    },
  }),
  splat(),
  errors({ stack: true }),
  label({ label: 'nabani-api' }),
  timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  printf((info) => {
    let output = `${info.timestamp as string} [${info.label as string}] ${info.level}: ${info.message as string}`;

    // Add metadata if present
    const meta: Record<string, unknown> = { ...info };
    delete meta.timestamp;
    delete meta.level;
    delete meta.message;
    delete meta.label;
    delete meta.stack;

    if (Object.keys(meta).length > 0) {
      output += ` ${JSON.stringify(meta)}`;
    }

    // Add stack trace if present
    if (info.stack) {
      output += `\n${info.stack as string}`;
    }

    return output;
  }),
);

// Production format - structured JSON
const prodFormat = combine(
  errors({ stack: true }),
  label({ label: 'nabani-api' }),
  timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  json(),
);

export const logger = createLogger({
  level: 'verbose',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new transports.Console()],
});

export const output = (req: Request, res: Response & { responseTime: number }): string => {
  let textOutput = `${req.method} - ${res.statusCode} ${req.url} ${res.responseTime}ms`;
  if (!_.isEmpty(req.params)) {
    const keys = Object.keys(req.params);
    const queryData = keys.map((key) => `${key}: ${JSON.stringify(req.params[key])}`).join(', ');
    textOutput = `${textOutput}
Params - ${queryData}`;
  }

  if (!_.isEmpty(req.query)) {
    const keys = Object.keys(req.query);
    const queryData = keys.map((key) => `${key}: ${JSON.stringify(req.query[key])}`).join(', ');
    textOutput = `${textOutput}
Query - ${queryData}`;
  }

  return textOutput;
};

export const logHttpRequest = (req: Request, res: Response & { responseTime?: number }): void => {
  const logMessage = output(req, res as Response & { responseTime: number });
  logger.http(logMessage);
};
