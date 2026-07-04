'use strict';

/**
 * Enables pg_trgm-based fuzzy search on article.concept, scoped per user.
 * Backs the receipt-scan matcher, replacing the in-memory Fuse.js index
 * (which loaded every user's articles into memory and was not user-scoped).
 *
 * Requires the pg_trgm and unaccent contrib extensions (available on RDS,
 * Supabase, and standard PostgreSQL). CREATE EXTENSION needs sufficient
 * privileges (superuser / rds_superuser); run once per database.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS unaccent;');

    // unaccent() is STABLE, not IMMUTABLE, so it cannot be used directly in a
    // functional index. Wrapping it with an explicit dictionary makes it IMMUTABLE.
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION immutable_unaccent(text)
        RETURNS text
        LANGUAGE sql
        IMMUTABLE
        PARALLEL SAFE
      AS $func$ SELECT public.unaccent('public.unaccent', $1) $func$;
    `);

    // Trigram GIN index over the normalized (lowercased, unaccented) concept.
    // Backs similarity()/% lookups: WHERE immutable_unaccent(lower(concept)) % :q
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS article_concept_trgm
        ON article
        USING gin (immutable_unaccent(lower(concept)) gin_trgm_ops);
    `);
  },

  async down(queryInterface) {
    // Drop the index before the function it depends on.
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS article_concept_trgm;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS immutable_unaccent(text);');
    // Extensions are intentionally left installed; other features may rely on them.
  },
};
