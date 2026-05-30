const pitchRepository = require('../repositories/pitchRepository');

class PitchService {
  async getAllPitches() {
    return pitchRepository.findAll();
  }
}

module.exports = new PitchService();
