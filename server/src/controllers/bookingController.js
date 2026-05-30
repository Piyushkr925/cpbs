const bookingService = require('../services/bookingService');

class BookingController {
  async reserveSlot(req, res, next) {
    try {
      const { pitchId, slotId, date } = req.body;
      if (!pitchId || !slotId || !date) {
        return res.status(400).json({ message: 'pitchId, slotId and date are required' });
      }
      const result = await bookingService.reserveSlot(req.user.id, { pitchId, slotId, date });
      const io = req.app.get('io');

      for (const released of result.releasedSlots || []) {
        io.emitSlotUpdate({
          pitchId: released.pitchId,
          date: released.date,
          slotId: released.slotId,
          availability: 'available',
        });
      }

      io.emitSlotUpdate({
        pitchId: result.pitchId,
        date: result.date,
        slotId: result.slotId,
        availability: 'reserved',
        userId: req.user.id,
        expiresAt: result.expiresAt,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async confirmBooking(req, res, next) {
    try {
      const { reservationId } = req.body;
      if (!reservationId) {
        return res.status(400).json({ message: 'reservationId is required' });
      }
      const { booking, alreadyConfirmed } = await bookingService.confirmBooking(req.user.id, {
        reservationId,
      });

      if (!alreadyConfirmed) {
        req.app.get('io').emitSlotUpdate({
          pitchId: booking.pitch_id,
          date: booking.booking_date,
          slotId: booking.slot_id,
          availability: 'booked',
          userId: req.user.id,
        });
      }

      res.status(alreadyConfirmed ? 200 : 201).json({
        message: alreadyConfirmed ? 'Booking already confirmed' : 'Booking confirmed',
        booking,
        alreadyConfirmed,
      });
    } catch (error) {
      next(error);
    }
  }

  async getActiveReservation(req, res, next) {
    try {
      const { pitchId, date } = req.query;
      const reservation = await bookingService.getActiveReservation(req.user.id, {
        pitchId,
        date,
      });
      res.json(reservation);
    } catch (error) {
      next(error);
    }
  }

  async getMyBookings(req, res, next) {
    try {
      const bookings = await bookingService.getMyBookings(req.user.id);
      res.json(bookings);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingController();
