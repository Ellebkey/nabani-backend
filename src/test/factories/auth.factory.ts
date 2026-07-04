import { LoginDto, RegisterDto, JWTResponse } from '@interfaces/user.dto';

export const TEST_USER_ID = 'auth-user-uuid-001';

export function makeLoginDto(overrides: Record<string, unknown> = {}): LoginDto {
  return {
    username: 'testuser',
    password: 'Password123!',
    ...overrides,
  };
}

export function makeRegisterDto(overrides: Record<string, unknown> = {}): RegisterDto {
  return {
    username: 'newuser',
    password: 'Password123!',
    email: 'newuser@test.com',
    ...overrides,
  };
}

export function makeUserInstance(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    id: TEST_USER_ID,
    username: 'testuser',
    email: 'testuser@test.com',
    hashedPassword: '$2b$10$hashedpasswordhere',
    emailVerified: true,
    roles: ['user'],
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return base;
}

export function makeJWTResponse(overrides: Record<string, unknown> = {}): JWTResponse {
  return {
    token: 'mock-jwt-token',
    refreshToken: 'mock-refresh-token',
    roles: ['user'],
    username: 'testuser',
    expiresIn: '2024-01-15T12:15:00Z',
    ...overrides,
  };
}
