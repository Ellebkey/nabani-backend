'use strict';

/**
 * Human display name for users. The app historically used `username` (an
 * email) as the visible label; `fullname` lets the UI show a real name in
 * the household members list, profile and top-bar menu.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user', 'fullname', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user', 'fullname');
  },
};
