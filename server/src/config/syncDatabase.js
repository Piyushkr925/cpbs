const {
  sequelize,
  User,
  Pitch,
  Slot,
  Booking,
  Reservation,
} = require('../models');

async function syncTables({ alter = true, force = false } = {}) {
  await sequelize.sync({ alter, force });
}

async function truncateTables() {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

  const tables = [
    Reservation.tableName,
    Booking.tableName,
    Slot.tableName,
    Pitch.tableName,
    User.tableName,
  ];

  for (const table of tables) {
    await sequelize.query(`TRUNCATE TABLE \`${table}\``);
  }

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function forceRecreateTables() {
  await sequelize.sync({ force: true });
}

async function connectDatabase() {
  await sequelize.authenticate();
}

module.exports = {
  connectDatabase,
  syncTables,
  truncateTables,
  forceRecreateTables,
};
