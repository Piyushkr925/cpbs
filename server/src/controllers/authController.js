const authService = require('../services/authService');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email and password are required' });
      }
      const result = await authService.register({ name, email, password });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      const result = await authService.login({ email, password });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  logout(req, res) {
    res.json({ success: true });
  }
}

module.exports = new AuthController();
