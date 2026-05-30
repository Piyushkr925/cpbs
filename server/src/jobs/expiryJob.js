const { Reservation } = require('../models');
const { Op } = require('sequelize');
const reservationRepository = require('../repositories/reservationRepository');

function startExpiryJob(io) {
  setInterval(async () => {
    try {
      const expiring = await Reservation.findAll({
        where: { expires_at: { [Op.lte]: new Date() } },
      });

      if (expiring.length === 0) return;

      for (const r of expiring) {
        io.emitSlotUpdate({
          pitchId: r.pitch_id,
          date: r.booking_date,
          slotId: r.slot_id,
          availability: 'available',
        });
      }

      await reservationRepository.deleteExpired();
    } catch (err) {
      console.error('Expiry job error:', err.message);
    }
  }, 15000);
}

module.exports = { startExpiryJob };
