import { db } from '@config/sequelize';
import JWTService from '@services/jwt.service';

interface TestUser {
  id: string;
  username: string;
  token: string;
}

let userCounter = 0;

export async function createAuthenticatedUser(overrides?: { username?: string; roles?: string[] }): Promise<TestUser> {
  userCounter += 1;
  const username = overrides?.username || `testuser-${userCounter}-${Date.now()}`;
  const roles = overrides?.roles || ['user'];

  const user = await db.User.create({
    username,
    hashedPassword: '$2b$10$dummyhashedpasswordfortesting123456',
    email: `${username}@test.com`,
    roles,
  });

  const token = JWTService.generateToken({
    id: user.id,
    username: user.username,
    roles: user.roles || ['user'],
  });

  return {
    id: user.id,
    username: user.username,
    token,
  };
}

export function resetUserCounter(): void {
  userCounter = 0;
}
