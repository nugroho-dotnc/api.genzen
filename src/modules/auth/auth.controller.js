'use strict';

const authService = require('./auth.service');
const { sendSuccess } = require('../../utils/response');

const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    const result = await authService.register({ name, email, password, confirmPassword });
    return sendSuccess(res, result, 'User registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    return sendSuccess(res, result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, logout };
