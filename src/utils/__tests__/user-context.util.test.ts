import {
  requireUserId, requireSelf, requireSelfOrAdmin, requireAdmin,
} from '@utils/user-context.util';
import { ForbiddenError } from '@errors/app-error';
import { JWTPayload } from '@interfaces/user.dto';

describe('user-context.util', () => {
  // ─── requireUserId ─────────────────────────────────────────────────

  describe('requireUserId', () => {
    it('When userId is present, returns it', () => {
      expect(requireUserId('user-123')).toBe('user-123');
    });

    it('When userId is undefined, throws ForbiddenError', () => {
      expect(() => requireUserId(undefined)).toThrow(ForbiddenError);
    });

    it('When userId is empty string, throws ForbiddenError', () => {
      expect(() => requireUserId('')).toThrow(ForbiddenError);
    });
  });

  // ─── requireSelf ──────────────────────────────────────────────────

  describe('requireSelf', () => {
    const user: JWTPayload = { id: 'user-123', username: 'testuser', roles: ['user'] };

    it('When user id matches target, returns userId', () => {
      expect(requireSelf(user, 'user-123')).toBe('user-123');
    });

    it('When user id does not match target, throws ForbiddenError', () => {
      expect(() => requireSelf(user, 'other-user')).toThrow(ForbiddenError);
    });

    it('When user is undefined, throws ForbiddenError', () => {
      expect(() => requireSelf(undefined, 'user-123')).toThrow(ForbiddenError);
    });

    it('When user has no id, throws ForbiddenError', () => {
      const noIdUser: JWTPayload = { username: 'testuser', roles: ['user'] };
      expect(() => requireSelf(noIdUser, 'user-123')).toThrow(ForbiddenError);
    });
  });

  // ─── requireSelfOrAdmin ───────────────────────────────────────────

  describe('requireSelfOrAdmin', () => {
    const regularUser: JWTPayload = { id: 'user-123', username: 'testuser', roles: ['user'] };
    const adminUser: JWTPayload = { id: 'admin-456', username: 'admin', roles: ['admin'] };

    it('When user accesses own resource, returns userId', () => {
      expect(requireSelfOrAdmin(regularUser, 'user-123')).toBe('user-123');
    });

    it('When admin accesses another user resource, returns admin userId', () => {
      expect(requireSelfOrAdmin(adminUser, 'user-123')).toBe('admin-456');
    });

    it('When regular user accesses another user resource, throws ForbiddenError', () => {
      expect(() => requireSelfOrAdmin(regularUser, 'other-user')).toThrow(ForbiddenError);
    });

    it('When user is undefined, throws ForbiddenError', () => {
      expect(() => requireSelfOrAdmin(undefined, 'user-123')).toThrow(ForbiddenError);
    });
  });

  // ─── requireAdmin ────────────────────────────────────────────────

  describe('requireAdmin', () => {
    it('When user has admin role, returns userId', () => {
      const admin: JWTPayload = { id: 'admin-1', username: 'admin', roles: ['admin'] };
      expect(requireAdmin(admin)).toBe('admin-1');
    });

    it('When user has admin among multiple roles, returns userId', () => {
      const admin: JWTPayload = { id: 'admin-1', username: 'admin', roles: ['user', 'admin'] };
      expect(requireAdmin(admin)).toBe('admin-1');
    });

    it('When user is not admin, throws ForbiddenError', () => {
      const user: JWTPayload = { id: 'user-1', username: 'user', roles: ['user'] };
      expect(() => requireAdmin(user)).toThrow(ForbiddenError);
    });

    it('When user has no roles, throws ForbiddenError', () => {
      const user: JWTPayload = { id: 'user-1', username: 'user', roles: [] };
      expect(() => requireAdmin(user)).toThrow(ForbiddenError);
    });

    it('When user is undefined, throws ForbiddenError', () => {
      expect(() => requireAdmin(undefined)).toThrow(ForbiddenError);
    });
  });
});
