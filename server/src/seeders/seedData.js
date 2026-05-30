const { Pitch, Slot } = require('../models');
const { generateHourlySlots } = require('../utils/generateSlots');

async function seedPitchesAndSlots() {
  const pitches = await Pitch.bulkCreate([
    { name: 'Pitch 1 – Turf Ground', location: 'Main Ground, Block A', price_per_hour: 1500 },
    { name: 'Pitch 2 – Box Cricket', location: 'Indoor Arena, Block B', price_per_hour: 1200 },
    { name: 'Pitch 3 – Indoor Nets', location: 'Training Center, Block C', price_per_hour: 800 },
  ]);

  for (const pitch of pitches) {
    const slots = generateHourlySlots(pitch.id, 6, 22);
    await Slot.bulkCreate(slots);
  }

  return pitches.length;
}

module.exports = { seedPitchesAndSlots };
