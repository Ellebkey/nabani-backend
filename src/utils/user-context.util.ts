import { ForbiddenError } from '@errors/app-error';

import { JWTPayload } from '@interfaces/user.dto';

function requireUserId(userId: string | undefined): string {
  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }
  return userId;
}

function requireSelf(user: JWTPayload | undefined, targetUserId: string): string {
  const userId = requireUserId(user?.id);

  if (userId !== targetUserId) {
    throw new ForbiddenError('Access denied: you can only access your own resources');
  }
  return userId;
}

function requireSelfOrAdmin(user: JWTPayload | undefined, targetUserId: string): string {
  const userId = requireUserId(user?.id);
  const isAdmin = user?.roles?.includes('admin') ?? false;

  if (userId !== targetUserId && !isAdmin) {
    throw new ForbiddenError('Access denied: you can only access your own resources');
  }
  return userId;
}

function requireAdmin(user: JWTPayload | undefined): string {
  const userId = requireUserId(user?.id);
  const isAdmin = user?.roles?.includes('admin') ?? false;

  if (!isAdmin) {
    throw new ForbiddenError('Access denied: admin privileges required');
  }
  return userId;
}

export { requireUserId, requireSelf, requireSelfOrAdmin, requireAdmin };
