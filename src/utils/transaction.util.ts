import { AsyncLocalStorage } from 'async_hooks';
import { Transaction } from 'sequelize';
import { db } from '@config/sequelize';

const transactionStorage = new AsyncLocalStorage<Transaction>();

/**
 * Executes a function within a transaction, automatically handling commit and rollback.
 * If called within an existing transaction context, reuses that transaction.
 * @param callback Function to execute within the transaction
 * @returns The result of the callback function
 */
async function withTransaction<T>(callback: (t: Transaction) => Promise<T>): Promise<T> {
  // Check if we're already in a transaction context
  const existingTransaction = transactionStorage.getStore();
  if (existingTransaction) {
    // Reuse existing transaction - don't commit/rollback here
    return callback(existingTransaction);
  }

  // Start a new transaction
  const transaction = await db.sequelize.transaction();
  try {
    const result = await transactionStorage.run(transaction, () => callback(transaction));
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export default withTransaction;
