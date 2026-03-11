'use strict';

const dashboardService = require('./dashboard.service');
const { sendSuccess } = require('../../utils/response');

const summary = async (req, res, next) => {
    try {
        const { period } = req.query;
        const data = await dashboardService.getSummary(req.user.id, period);
        return sendSuccess(res, data, 'Dashboard summary fetched successfully');
    } catch (err) {
        next(err);
    }
};

const heatmap = async (req, res, next) => {
    try {
        const { period } = req.query;
        const data = await dashboardService.getHeatmap(req.user.id, period);
        return sendSuccess(res, data, 'Heatmap data fetched successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = { summary, heatmap };
