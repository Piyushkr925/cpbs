const pitchService = require('../services/pitchService');

class PitchController {
  async getAll(req, res, next) {
    try {
      const pitches = await pitchService.getAllPitches();
      res.json(pitches);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PitchController();
