'use strict';

const categoryService = require('./category.service');
const { sendSuccess } = require('../../utils/response');

const list = async (req, res, next) => {
  try {
    const data = await categoryService.list(req.user.id);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await categoryService.create(req.user.id, req.body);
    return sendSuccess(res, data, 'Category created', 201);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const data = await categoryService.getOne(req.user.id, req.params.id);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await categoryService.update(req.user.id, req.params.id, req.body);
    return sendSuccess(res, data, 'Category updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await categoryService.remove(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Category deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, getOne, update, remove };