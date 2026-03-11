'use strict';

const activityService = require('./activity.service');
const { sendSuccess } = require('../../utils/response');

const list = async (req, res, next) => {
  try {
    const { date, type, status, priority } = req.query;
    const data = await activityService.list(req.user.id, { date, type, status, priority });
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await activityService.create(req.user.id, req.body);
    return sendSuccess(res, data, 'Activity created', 201);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const data = await activityService.getOne(req.user.id, req.params.id);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await activityService.update(req.user.id, req.params.id, req.body);
    return sendSuccess(res, data, 'Activity updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await activityService.remove(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Activity deleted');
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const data = await activityService.updateStatus(req.user.id, req.params.id, status);
    return sendSuccess(res, data, 'Status updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, getOne, update, remove, updateStatus };
