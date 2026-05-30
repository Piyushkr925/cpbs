const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const userRepository = require('../repositories/userRepository');

class AuthService {
  async register({ name, email, password }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = this.generateToken(user);
    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);
    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  }

  generateToken(user) {
    return jwt.sign({ id: user.id, email: user.email }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    });
  }
}

module.exports = new AuthService();
