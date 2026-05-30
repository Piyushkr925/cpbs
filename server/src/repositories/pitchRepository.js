const { Pitch } = require('../models');

class PitchRepository {
  async findAll() {
    return Pitch.findAll({ order: [['id', 'ASC']] });
  }

  async findById(id) {
    return Pitch.findByPk(id);
  }

  async create(data) {
    return Pitch.create(data);
  }
}

module.exports = new PitchRepository();
