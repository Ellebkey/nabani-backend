import { SequelizeDB, db } from '@config/sequelize';

export async function initTestDatabase(): Promise<void> {
  const sequelizeDB = new SequelizeDB();
  await sequelizeDB.initDataBase();
  await db.sequelize.sync({ force: true });
}

export async function cleanDatabase(): Promise<void> {
  const tableNames = Object.keys(db)
    .filter((key) => key !== 'sequelize')
    .map((key) => {
      const model = db[key as keyof typeof db];
      if (model && 'tableName' in model) {
        return `"${(model as { tableName: string }).tableName}"`;
      }
      return null;
    })
    .filter(Boolean);

  if (tableNames.length > 0) {
    await db.sequelize.query(`TRUNCATE TABLE ${tableNames.join(', ')} CASCADE`);
  }
}

export async function closeTestDatabase(): Promise<void> {
  if (db.sequelize) {
    await db.sequelize.close();
  }
}
