const slotRepository = require('../repositories/slotRepository');
const bookingRepository = require('../repositories/bookingRepository');
const reservationRepository = require('../repositories/reservationRepository');
const pitchRepository = require('../repositories/pitchRepository');

class SlotService {
  formatTime(time) {
    if (!time) return '';
    const str = typeof time === 'string' ? time : time.toString();
    return str.slice(0, 5);
  }

  async getSlotsWithAvailability(pitchId, date) {
    const pitch = await pitchRepository.findById(pitchId);
    if (!pitch) {
      throw new Error('Pitch not found');
    }

    const slots = await slotRepository.findByPitchId(pitchId);
    const booked = await bookingRepository.findConfirmedForPitchDate(pitchId, date);
    const reserved = await reservationRepository.findActiveForPitchDate(pitchId, date);

    const bookedSet = new Set(booked.map((b) => b.slot_id));
    const reservedMap = new Map(reserved.map((r) => [r.slot_id, r]));

    return slots.map((slot) => {
      let availability = 'available';
      let reservedBy = null;
      let expiresAt = null;

      if (bookedSet.has(slot.id)) {
        availability = 'booked';
      } else if (reservedMap.has(slot.id)) {
        availability = 'reserved';
        const r = reservedMap.get(slot.id);
        reservedBy = r.user_id;
        expiresAt = r.expires_at;
      }

      return {
        id: slot.id,
        pitch_id: slot.pitch_id,
        start_time: this.formatTime(slot.start_time),
        end_time: this.formatTime(slot.end_time),
        availability,
        reserved_by: reservedBy,
        expires_at: expiresAt,
      };
    });
  }
}

module.exports = new SlotService();
