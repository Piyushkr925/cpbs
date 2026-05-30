const { Op } = require('sequelize');
const { Reservation } = require('../models');

class ReservationRepository {
  async findActive(pitchId, slotId, bookingDate, transaction, lock) {
    const options = {
      where: {
        pitch_id: pitchId,
        slot_id: slotId,
        booking_date: bookingDate,
        expires_at: { [Op.gt]: new Date() },
      },
    };
    if (transaction) options.transaction = transaction;
    if (lock) options.lock = lock;
    return Reservation.findOne(options);
  }

  async findByIdAndUser(id, userId, transaction, lock) {
    const options = {
      where: {
        id,
        user_id: userId,
        expires_at: { [Op.gt]: new Date() },
      },
    };
    if (transaction) options.transaction = transaction;
    if (lock) options.lock = lock;
    return Reservation.findOne(options);
  }

  async create(data, transaction) {
    return Reservation.create(data, { transaction });
  }

  async deleteById(id, transaction) {
    return Reservation.destroy({ where: { id }, transaction });
  }

  async deleteExpired() {
    return Reservation.destroy({
      where: {
        expires_at: { [Op.lte]: new Date() },
      },
    });
  }

  async findActiveForPitchDate(pitchId, bookingDate) {
    return Reservation.findAll({
      where: {
        pitch_id: pitchId,
        booking_date: bookingDate,
        expires_at: { [Op.gt]: new Date() },
      },
      attributes: ['slot_id', 'user_id', 'expires_at'],
    });
  }

  async findByUserPitchSlotDate(userId, pitchId, slotId, bookingDate, transaction) {
    return Reservation.findOne({
      where: { user_id: userId, pitch_id: pitchId, slot_id: slotId, booking_date: bookingDate },
      transaction,
    });
  }

  async upsertReservation(data, transaction) {
    const existing = await this.findByUserPitchSlotDate(
      data.user_id,
      data.pitch_id,
      data.slot_id,
      data.booking_date,
      transaction
    );
    if (existing) {
      await existing.update({ expires_at: data.expires_at }, { transaction });
      return existing;
    }
    return this.create(data, transaction);
  }

  async deleteOtherActiveByUser(userId, pitchId, slotId, bookingDate, transaction) {
    const rows = await Reservation.findAll({
      where: {
        user_id: userId,
        expires_at: { [Op.gt]: new Date() },
        [Op.or]: [
          { pitch_id: { [Op.ne]: pitchId } },
          { slot_id: { [Op.ne]: slotId } },
          { booking_date: { [Op.ne]: bookingDate } },
        ],
      },
      transaction,
    });

    if (rows.length === 0) return [];

    await Reservation.destroy({
      where: { id: rows.map((r) => r.id) },
      transaction,
    });

    return rows;
  }

  async findActiveByUser(userId, pitchId, bookingDate) {
    const where = {
      user_id: userId,
      expires_at: { [Op.gt]: new Date() },
    };
    if (pitchId) where.pitch_id = pitchId;
    if (bookingDate) where.booking_date = bookingDate;

    return Reservation.findOne({
      where,
      order: [['expires_at', 'DESC']],
    });
  }
}

module.exports = new ReservationRepository();
