const slotService = require('../services/slotService');

class SlotController {
  async getSlots(req, res, next) {
    try {
      const { pitchId, date } = req.query;
      if (!pitchId || !date) {
        return res.status(400).json({ message: 'pitchId and date are required' });
      }
      const slots = await slotService.getSlotsWithAvailability(pitchId, date);
      res.json(slots);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SlotController();
