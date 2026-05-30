require('dotenv').config();
const { Pitch } = require('../models');
const {
  connectDatabase,
  syncTables,
  truncateTables,
  forceRecreateTables,
} = require('../config/syncDatabase');
const { seedPitchesAndSlots } = require('../seeders/seedData');

const command = process.argv[2] || 'sync';

async function run() {
  try {
    await connectDatabase();

    switch (command) {
      case 'sync':
        await syncTables({ alter: true, force: false });
        console.log('Tables synced');
        break;

      case 'truncate':
        await syncTables({ alter: true, force: false });
        await truncateTables();
        console.log('Tables truncated');
        break;

      case 'force':
        await forceRecreateTables();
        console.log('Tables recreated');
        break;

      case 'reset':
        await syncTables({ alter: true, force: false });
        await truncateTables();
        await seedPitchesAndSlots();
        console.log('Database reset complete');
        break;

      case 'seed':
        await syncTables({ alter: true, force: false });
        const count = await Pitch.count();
        if (count > 0) {
          console.log('Already seeded');
          break;
        }
        await seedPitchesAndSlots();
        console.log('Seed complete');
        break;

      default:
        console.log('Usage: db:sync | db:truncate | db:force | db:reset | db:seed');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

run();
