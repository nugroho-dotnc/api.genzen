'use strict';

const aiService = require('./ai.service');
const { sendSuccess } = require('../../utils/response');

const parse = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    const result = await aiService.parse(prompt, req.user.id);
    return sendSuccess(res, result, 'AI response parsed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { parse };
