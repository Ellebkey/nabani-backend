import { Express } from 'express';

import ExpressServer from '@config/express';

let cachedApp: Express | null = null;

export function getApp(): Express {
  if (!cachedApp) {
    cachedApp = new ExpressServer().app;
  }
  return cachedApp;
}
