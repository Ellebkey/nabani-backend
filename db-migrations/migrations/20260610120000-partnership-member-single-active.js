'use strict';

/**
 * A user may hold at most one ACTIVE partnership membership. Partial unique
 * index backstops the service-level guard against concurrent accepts.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('partnership_member', ['user_id'], {
      name: 'idx_partnership_member_single_active',
      unique: true,
      where: { status: 'active' },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('partnership_member', 'idx_partnership_member_single_active');
  },
};
