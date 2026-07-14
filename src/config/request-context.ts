import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-request correlation context propagated through AsyncLocalStorage.
 *
 * The logger reads this store on every emit, so any log line produced while
 * handling a request automatically carries `requestId`/`userId` without
 * threading those values through service call signatures.
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  apiKeyId?: number;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Run `callback` (the rest of the middleware chain) inside a fresh context. */
export const runWithRequestContext = (context: RequestContext, callback: () => void): void => {
  storage.run(context, callback);
};

/** The active request context, or undefined outside a request scope. */
export const getRequestContext = (): RequestContext | undefined => storage.getStore();

/**
 * Enrich the active context after the fact (e.g. auth middleware attaching the
 * authenticated user). No-op outside a request scope, so it is safe to call
 * from code that also runs in scripts or tests.
 */
export const setRequestContext = (values: Partial<Omit<RequestContext, 'requestId'>>): void => {
  const store = storage.getStore();
  if (!store) {
    return;
  }
  if (values.userId !== undefined) {
    store.userId = values.userId;
  }
  if (values.apiKeyId !== undefined) {
    store.apiKeyId = values.apiKeyId;
  }
};
