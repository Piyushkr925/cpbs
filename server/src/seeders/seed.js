require('dotenv').config();
const { Pitch } = require('../models');
const { connectDatabase, syncTables } = require('../config/syncDatabase');
const { seedPitchesAndSlots } = require('./seedData');

async function seed() {
  try {
    await connectDatabase();
    await syncTables({ alter: true, force: false });

    const pitchCount = await Pitch.count();
    if (pitchCount > 0) {
      console.log('Database already seeded');
      process.exit(0);
    }

    await seedPitchesAndSlots();
    console.log('Seed completed: 3 pitches with hourly slots (6 AM - 10 PM)');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
