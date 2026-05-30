const { Booking, Slot, Pitch } = require('../models');

class BookingRepository {
  async findConfirmed(pitchId, slotId, bookingDate, transaction, lock) {
    const options = {
      where: {
        pitch_id: pitchId,
        slot_id: slotId,
        booking_date: bookingDate,
        status: 'confirmed',
      },
    };
    if (transaction) options.transaction = transaction;
    if (lock) options.lock = lock;
    return Booking.findOne(options);
  }

  async create(data, transaction) {
    return Booking.create(data, { transaction });
  }

  async findByUserId(userId) {
    return Booking.findAll({
      where: { user_id: userId },
      include: [
        { model: Pitch, as: 'pitch', attributes: ['id', 'name', 'location', 'price_per_hour'] },
        { model: Slot, as: 'slot', attributes: ['id', 'start_time', 'end_time'] },
      ],
      order: [['booking_date', 'DESC'], ['created_at', 'DESC']],
    });
  }

  async findConfirmedForPitchDate(pitchId, bookingDate) {
    return Booking.findAll({
      where: {
        pitch_id: pitchId,
        booking_date: bookingDate,
        status: 'confirmed',
      },
      attributes: ['slot_id'],
    });
  }

  async findByReservationId(reservationId, userId) {
    return Booking.findOne({
      where: {
        reservation_id: reservationId,
        user_id: userId,
        status: 'confirmed',
      },
    });
  }

  async findByUserPitchSlotDate(userId, pitchId, slotId, bookingDate) {
    return Booking.findOne({
      where: {
        user_id: userId,
        pitch_id: pitchId,
        slot_id: slotId,
        booking_date: bookingDate,
        status: 'confirmed',
      },
    });
  }
}

module.exports = new BookingRepository();
