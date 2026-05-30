function generateHourlySlots(pitchId, startHour = 6, endHour = 22) {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const start = `${String(hour).padStart(2, '0')}:00:00`;
    const end = `${String(hour + 1).padStart(2, '0')}:00:00`;
    slots.push({
      pitch_id: pitchId,
      start_time: start,
      end_time: end,
      status: 'active',
    });
  }
  return slots;
}

module.exports = { generateHourlySlots };
