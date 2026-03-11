'use strict';

const noteService = require('./note.service');
const { sendSuccess } = require('../../utils/response');

const list = async (req, res, next) => {
  try {
    const { isPinned, relatedDate } = req.query;
    const data = await noteService.list(req.user.id, { isPinned, relatedDate });
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await noteService.create(req.user.id, req.body);
    return sendSuccess(res, data, 'Note created', 201);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const data = await noteService.getOne(req.user.id, req.params.id);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await noteService.update(req.user.id, req.params.id, req.body);
    return sendSuccess(res, data, 'Note updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await noteService.remove(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Note deleted');
  } catch (err) {
    next(err);
  }
};

const togglePin = async (req, res, next) => {
  try {
    const data = await noteService.togglePin(req.user.id, req.params.id);
    return sendSuccess(res, data, `Note ${data.isPinned ? 'pinned' : 'unpinned'}`);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, getOne, update, remove, togglePin };
