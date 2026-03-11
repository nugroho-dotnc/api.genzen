'use strict';

const activityLogService = require('./activityLog.service');
const { sendSuccess } = require('../../utils/response');

const list = async (req, res, next) => {
  try {
    const { activityId } = req.query;
    const data = await activityLogService.list(req.user.id, { activityId });
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getHeatmap = async (req, res, next) => {
  try {
    const data = await activityLogService.getHeatmap(req.user.id);
    return sendSuccess(res, data, 'Heatmap data fetched successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getHeatmap };
