import { Request, Response } from 'express';

export interface TestUser {
  id: string;
  roles: string[];
}

export const DEFAULT_TEST_USER: TestUser = { id: 'user-uuid', roles: ['user'] };

export function makeMockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    user: DEFAULT_TEST_USER,
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

export function makeMockRes() {
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
