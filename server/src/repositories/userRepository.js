const { User } = require('../models');

class UserRepository {
  async findByEmail(email) {
    return User.findOne({ where: { email } });
  }

  async findById(id) {
    return User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });
  }

  async create(data) {
    return User.create(data);
  }
}

module.exports = new UserRepository();
