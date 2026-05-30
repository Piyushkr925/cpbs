const { sequelize, Reservation } = require('../models');
const { Op } = require('sequelize');
const bookingRepository = require('../repositories/bookingRepository');
const reservationRepository = require('../repositories/reservationRepository');
const slotRepository = require('../repositories/slotRepository');
const pitchRepository = require('../repositories/pitchRepository');

const RESERVATION_MINUTES = 2;

class BookingService {
  formatReservationResponse(reservation, releasedSlots = []) {
    return {
      reservationId: reservation.id,
      pitchId: reservation.pitch_id,
      slotId: reservation.slot_id,
      date: reservation.booking_date,
      expiresAt: reservation.expires_at,
      message: `Slot reserved for ${RESERVATION_MINUTES} minutes.`,
      releasedSlots: releasedSlots.map((r) => ({
        pitchId: r.pitch_id,
        slotId: r.slot_id,
        date: r.booking_date,
      })),
    };
  }

  async reserveSlot(userId, { pitchId, slotId, date }) {
    const pitch = await pitchRepository.findById(pitchId);
    if (!pitch) throw new Error('Pitch not found');

    const slot = await slotRepository.findById(slotId);
    if (!slot || slot.pitch_id !== Number(pitchId)) {
      throw new Error('Invalid slot for this pitch');
    }

    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

    const { reservation, releasedSlots } = await sequelize.transaction(async (transaction) => {
      await Reservation.destroy({
        where: {
          pitch_id: pitchId,
          slot_id: slotId,
          booking_date: date,
          expires_at: { [Op.lte]: new Date() },
        },
        transaction,
      });

      const releasedSlots = await reservationRepository.deleteOtherActiveByUser(
        userId,
        pitchId,
        slotId,
        date,
        transaction
      );

      const existingBooking = await bookingRepository.findConfirmed(
        pitchId,
        slotId,
        date,
        transaction,
        transaction.LOCK.UPDATE
      );
      if (existingBooking) {
        throw new Error('Slot is already booked');
      }

      const activeReservation = await reservationRepository.findActive(
        pitchId,
        slotId,
        date,
        transaction,
        transaction.LOCK.UPDATE
      );

      if (activeReservation && activeReservation.user_id !== userId) {
        throw new Error('Slot is currently reserved by another user');
      }

      const reservation = await reservationRepository.upsertReservation(
        {
          user_id: userId,
          pitch_id: pitchId,
          slot_id: slotId,
          booking_date: date,
          expires_at: expiresAt,
        },
        transaction
      );

      return { reservation, releasedSlots };
    });

    return this.formatReservationResponse(reservation, releasedSlots);
  }

  async confirmBooking(userId, { reservationId }) {
    const existingBooking = await bookingRepository.findByReservationId(reservationId, userId);
    if (existingBooking) {
      return { booking: existingBooking, alreadyConfirmed: true };
    }

    try {
      return await sequelize.transaction(async (transaction) => {
        const reservation = await reservationRepository.findByIdAndUser(
          reservationId,
          userId,
          transaction,
          transaction.LOCK.UPDATE
        );

        if (!reservation) {
          throw new Error('Reservation not found or expired');
        }

        const duplicateBooking = await bookingRepository.findConfirmed(
          reservation.pitch_id,
          reservation.slot_id,
          reservation.booking_date,
          transaction,
          transaction.LOCK.UPDATE
        );

        if (duplicateBooking) {
          await reservationRepository.deleteById(reservation.id, transaction);
          if (duplicateBooking.user_id === userId) {
            return { booking: duplicateBooking, alreadyConfirmed: true };
          }
          throw new Error('Slot was booked by another user');
        }

        const booking = await bookingRepository.create(
          {
            user_id: userId,
            pitch_id: reservation.pitch_id,
            slot_id: reservation.slot_id,
            booking_date: reservation.booking_date,
            status: 'confirmed',
            reservation_id: reservationId,
          },
          transaction
        );

        await reservationRepository.deleteById(reservation.id, transaction);

        return { booking, alreadyConfirmed: false };
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const booking = await bookingRepository.findByReservationId(reservationId, userId);
        if (booking) {
          return { booking, alreadyConfirmed: true };
        }
      }
      throw error;
    }
  }

  async getActiveReservation(userId, { pitchId, date } = {}) {
    const reservation = await reservationRepository.findActiveByUser(userId, pitchId, date);
    if (!reservation) {
      return null;
    }
    return this.formatReservationResponse(reservation);
  }

  async getMyBookings(userId) {
    return bookingRepository.findByUserId(userId);
  }
}

module.exports = new BookingService();
