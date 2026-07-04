jest.mock('@config/sequelize', () => ({
  db: {
    sequelize: {
      transaction: jest.fn(),
    },
  },
}));

import { db } from '@config/sequelize';
import withTransaction from '@utils/transaction.util';

const mockSequelize = db.sequelize as unknown as {
  transaction: jest.Mock;
};

function makeMockTransaction() {
  return {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  };
}

describe('transaction.util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withTransaction', () => {
    it('When callback succeeds, commits the transaction', async () => {
      const mockTx = makeMockTransaction();
      mockSequelize.transaction.mockResolvedValue(mockTx);

      const result = await withTransaction(async () => 'success');

      expect(mockTx.commit).toHaveBeenCalled();
      expect(mockTx.rollback).not.toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('When callback throws, rolls back and re-throws', async () => {
      const mockTx = makeMockTransaction();
      mockSequelize.transaction.mockResolvedValue(mockTx);
      const error = new Error('Test error');

      await expect(
        withTransaction(async () => { throw error; }),
      ).rejects.toThrow('Test error');

      expect(mockTx.rollback).toHaveBeenCalled();
      expect(mockTx.commit).not.toHaveBeenCalled();
    });

    it('When callback returns a value, returns that value', async () => {
      const mockTx = makeMockTransaction();
      mockSequelize.transaction.mockResolvedValue(mockTx);

      const result = await withTransaction(async () => ({ id: 1, name: 'test' }));

      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('When called, passes transaction to callback', async () => {
      const mockTx = makeMockTransaction();
      mockSequelize.transaction.mockResolvedValue(mockTx);
      const callbackSpy = jest.fn().mockResolvedValue(undefined);

      await withTransaction(callbackSpy);

      expect(callbackSpy).toHaveBeenCalledWith(mockTx);
    });

    it('When nested call occurs, reuses existing transaction', async () => {
      const mockTx = makeMockTransaction();
      mockSequelize.transaction.mockResolvedValue(mockTx);

      let innerTransaction: unknown;
      await withTransaction(async (outerTx) => {
        await withTransaction(async (tx) => {
          innerTransaction = tx;
        });
        expect(innerTransaction).toBe(outerTx);
      });

      // Only one transaction should be created
      expect(mockSequelize.transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.commit).toHaveBeenCalledTimes(1);
    });
  });
});
