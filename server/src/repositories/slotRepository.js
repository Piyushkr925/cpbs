const { Slot } = require('../models');

class SlotRepository {
  async findByPitchId(pitchId) {
    return Slot.findAll({
      where: { pitch_id: pitchId, status: 'active' },
      order: [['start_time', 'ASC']],
    });
  }

  async findById(id, transaction, lock) {
    const options = {};
    if (transaction) options.transaction = transaction;
    if (lock) options.lock = lock;
    return Slot.findByPk(id, options);
  }

  async bulkCreate(slots, transaction) {
    return Slot.bulkCreate(slots, { transaction });
  }
}

module.exports = new SlotRepository();
