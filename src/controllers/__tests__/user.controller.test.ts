jest.mock('@services/user.service', () => require('../../test/unit/mocks/user.service.mock'));
jest.mock('@utils/validation.util', () => require('../../test/unit/mocks/validation.util.mock'));
jest.mock('@utils/user-context.util', () => require('../../test/unit/mocks/user-context.util.mock'));

import UserController from '@controllers/user.controller';
import UserService from '@services/user.service';
import { requireSelf } from '@utils/user-context.util';
import { validateDto } from '@utils/validation.util';
import { ForbiddenError, ValidationError } from '@errors/app-error';
import { makeMockReq, makeMockRes } from '../../test/helpers/mock-express';

const mockService = UserService as jest.Mocked<typeof UserService>;

describe('UserController', () => {
  let res: ReturnType<typeof makeMockRes>;
  let next: jest.Mock;

  beforeEach(() => {
    res = makeMockRes();
    next = jest.fn();
  });

  // ─── create ───────────────────────────────────────────────────

  describe('create', () => {
    it('When valid data, returns 201 with created user', async () => {
      const user = {
        id: 'u-1',
        username: 'testuser',
        email: 'test@mail.com',
        roles: ['user'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockService.create.mockResolvedValue(user);

      await UserController.create(
        makeMockReq({ body: { username: 'testuser', email: 'test@mail.com', password: 'Pass123!' } }),
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(user);
    });

    it('When validation fails, forwards ValidationError', async () => {
      (validateDto as jest.Mock).mockImplementationOnce(() => {
        throw new ValidationError('Validation failed', []);
      });

      await UserController.create(makeMockReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('When service throws, forwards error', async () => {
      mockService.create.mockRejectedValue(new Error('DB error'));

      await UserController.create(makeMockReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ─── update ───────────────────────────────────────────────────

  describe('update', () => {
    it('When self and valid data, returns updated user', async () => {
      const user = {
        id: 'user-uuid',
        username: 'updated',
        email: 'test@mail.com',
        roles: ['user'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockService.update.mockResolvedValue(user);

      await UserController.update(
        makeMockReq({ params: { id: 'user-uuid' }, body: { username: 'updated' } }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(user);
    });

    it('When not self, forwards ForbiddenError', async () => {
      (requireSelf as jest.Mock).mockImplementationOnce(() => {
        throw new ForbiddenError('Access denied');
      });

      await UserController.update(
        makeMockReq({ params: { id: 'other-user' } }),
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  // ─── getById ──────────────────────────────────────────────────

  describe('getById', () => {
    it('When user exists, returns user data', async () => {
      const user = {
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@mail.com',
        roles: ['user'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockService.findById.mockResolvedValue(user);

      await UserController.getById(
        makeMockReq({ params: { id: 'user-uuid' } }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(user);
    });

    it('When user not found, returns 404', async () => {
      mockService.findById.mockResolvedValue(null);

      await UserController.getById(
        makeMockReq({ params: { id: 'user-uuid' } }),
        res,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('When not self, forwards ForbiddenError', async () => {
      (requireSelf as jest.Mock).mockImplementationOnce(() => {
        throw new ForbiddenError('Access denied');
      });

      await UserController.getById(
        makeMockReq({ params: { id: 'other-user' } }),
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  // ─── list ─────────────────────────────────────────────────────

  describe('list', () => {
    it('When filters valid, returns paginated list', async () => {
      const result = {
        rows: [{
          id: 'u-1',
          username: 'testuser',
          email: 'test@mail.com',
          roles: ['user'],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        }],
        count: 1,
      };
      mockService.findAll.mockResolvedValue(result);

      await UserController.list(makeMockReq(), res, next);

      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('When service throws, forwards error', async () => {
      mockService.findAll.mockRejectedValue(new Error('DB error'));

      await UserController.list(makeMockReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ─── updateConfig ─────────────────────────────────────────────

  describe('updateConfig', () => {
    it('When self and valid data, returns updated config', async () => {
      const config = { defaultAccount: 'acc-1' };
      mockService.updateUserConfig.mockResolvedValue(config);

      await UserController.updateConfig(
        makeMockReq({ params: { id: 'user-uuid' }, body: config }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(config);
    });

    it('When not self, forwards ForbiddenError', async () => {
      (requireSelf as jest.Mock).mockImplementationOnce(() => {
        throw new ForbiddenError('Access denied');
      });

      await UserController.updateConfig(
        makeMockReq({ params: { id: 'other-user' } }),
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  // ─── getConfig ────────────────────────────────────────────────

  describe('getConfig', () => {
    it('When self, returns config', async () => {
      const config = { defaultAccount: 'acc-1' };
      mockService.getUserConfig.mockResolvedValue(config);

      await UserController.getConfig(
        makeMockReq({ params: { id: 'user-uuid' } }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith(config);
    });
  });

  // ─── setDefaultAccount ────────────────────────────────────────

  describe('setDefaultAccount', () => {
    it('When self and valid data, returns success', async () => {
      mockService.setDefaultAccount.mockResolvedValue(undefined);

      await UserController.setDefaultAccount(
        makeMockReq({ params: { id: 'user-uuid' }, body: { accountId: 'acc-1' } }),
        res,
        next,
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Default account set successfully',
      });
    });

    it('When not self, forwards ForbiddenError', async () => {
      (requireSelf as jest.Mock).mockImplementationOnce(() => {
        throw new ForbiddenError('Access denied');
      });

      await UserController.setDefaultAccount(
        makeMockReq({ params: { id: 'other-user' } }),
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
});
