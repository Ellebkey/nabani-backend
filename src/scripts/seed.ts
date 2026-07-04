/**
 * Nabani dev seed — idempotent reference data (findOrCreate).
 * Run: NODE_ENV=development npx tsx src/scripts/seed.ts
 * Extended over Phase 1 as domain models land (packages, sample patients, etc.).
 */
import { SequelizeDB, db } from '@config/sequelize';
import { logger } from '@config/logger';

/** 16-item disease catalog (design "Enfermedades" grid + patient/ingredient flags). */
const DISEASES: { key: string; name: string }[] = [
  { key: 'diabetes', name: 'Diabetes mellitus' },
  { key: 'arterosclerosis', name: 'Arterosclerosis' },
  { key: 'hipertension', name: 'Hipertensión' },
  { key: 'infartos', name: 'Infartos' },
  { key: 'tiroides', name: 'Tiroides' },
  { key: 'embarazo', name: 'Embarazo' },
  { key: 'lactante', name: 'Lactante' },
  { key: 'colesterolemia', name: 'Colesterolemia' },
  { key: 'trigliceridos', name: 'Triglicéridos' },
  { key: 'osteoporosis', name: 'Osteoporosis' },
  { key: 'digestion', name: 'Mala digestión' },
  { key: 'gastritis', name: 'Gastritis' },
  { key: 'colitis', name: 'Colitis' },
  { key: 'estrenimiento', name: 'Estreñimiento' },
  { key: 'hidratacion', name: 'Hidratación' },
  { key: 'hormonas', name: 'Cambios hormonales' },
];

/** kcal tiers (dynamic; seed the common levels). */
const CALORIE_LEVELS = [1300, 1700, 2000, 2200, 2500];

async function main(): Promise<void> {
  const database = new SequelizeDB();
  await database.initDataBase();

  for (const d of DISEASES) {
    await db.Disease.findOrCreate({ where: { key: d.key }, defaults: d });
  }
  logger.info(`Seeded ${DISEASES.length} diseases`);

  for (const [i, kcal] of CALORIE_LEVELS.entries()) {
    await db.CalorieLevel.findOrCreate({
      where: { kcal },
      defaults: { kcal, label: String(kcal), sortOrder: i + 1 },
    });
  }
  logger.info(`Seeded ${CALORIE_LEVELS.length} calorie levels`);

  logger.info('Nabani catalog seed complete.');
  process.exit(0);
}

main().catch((e) => {
  logger.error('Seed failed', e);
  process.exit(1);
});
