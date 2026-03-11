'use strict';

const gamificationService = require('./gamification.service');
const { sendSuccess } = require('../../utils/response');

const getGamification = async (req, res, next) => {
  try {
    // req.user.id didapat dari auth.middleware
    const data = await gamificationService.getGamification(req.user.id);
    return sendSuccess(res, data, 'Gamification data retrieved successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getGamification };