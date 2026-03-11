'use strict';

const prisma = require('../../config/prisma');
const ApiError = require('../../utils/apiError');

const VALID_SOURCES = ['ai', 'manual'];

const assertOwnership = async (userId, noteId) => {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) throw new ApiError(404, 'NOT_FOUND', 'Note not found');
  if (note.userId !== userId) throw new ApiError(403, 'FORBIDDEN', 'Access denied');
  return note;
};

const list = async (userId, filters = {}) => {
  const where = { userId };
  if (filters.isPinned !== undefined) where.isPinned = filters.isPinned === 'true';
  if (filters.relatedDate) {
    const day = new Date(filters.relatedDate);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    where.relatedDate = { gte: day, lt: nextDay };
  }
  return prisma.note.findMany({ where, orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }] });
};

const create = async (userId, body) => {
  const { title, content, isPinned, relatedDate, source } = body;
  if (!title || !content || !source) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'title, content, and source are required');
  }
  if (!VALID_SOURCES.includes(source)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid source');

  return prisma.note.create({
    data: {
      userId,
      title,
      content,
      isPinned: isPinned ?? false,
      relatedDate: relatedDate ? new Date(relatedDate) : null,
      source,
    },
  });
};

const getOne = async (userId, noteId) => assertOwnership(userId, noteId);

const update = async (userId, noteId, body) => {
  await assertOwnership(userId, noteId);
  const { title, content, isPinned, relatedDate } = body;

  return prisma.note.update({
    where: { id: noteId },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(isPinned !== undefined && { isPinned }),
      ...(relatedDate !== undefined && { relatedDate: relatedDate ? new Date(relatedDate) : null }),
    },
  });
};

const remove = async (userId, noteId) => {
  await assertOwnership(userId, noteId);
  return prisma.note.delete({ where: { id: noteId } });
};

const togglePin = async (userId, noteId) => {
  const note = await assertOwnership(userId, noteId);
  return prisma.note.update({
    where: { id: noteId },
    data: { isPinned: !note.isPinned },
  });
};

module.exports = { list, create, getOne, update, remove, togglePin };
