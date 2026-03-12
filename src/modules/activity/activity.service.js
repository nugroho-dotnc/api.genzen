'use strict';

const prisma = require('../../config/prisma');
const ApiError = require('../../utils/apiError');
const { syncTodayStreak } = require('../gamification/gamification.service');

// ─── Helpers ──────────────────────────────────────────────────────

const VALID_TYPES = ['task', 'schedule'];
const VALID_STATUSES = ['pending', 'done', 'skipped'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_SOURCES = ['ai', 'manual'];

const assertOwnership = async (userId, activityId) => {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) throw new ApiError(404, 'NOT_FOUND', 'Activity not found');
  if (activity.userId !== userId) throw new ApiError(403, 'FORBIDDEN', 'Access denied');
  return activity;
};

const toggle = async (activityId) => {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) throw new ApiError(404, 'NOT_FOUND', 'Activity not Found');

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: { status: activity.status === 'done' ? 'pending' : 'done' },
  });
  return updated;
}

const createLog = (userId, activityId, action) =>
  prisma.activityLog.create({ data: { userId, activityId, action } });

// ─── Service Functions ────────────────────────────────────────────

const list = async (userId, filters = {}) => {
  const where = { userId };

  if (filters.date) {
    const day = new Date(filters.date);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    where.date = { gte: day, lt: nextDay };
  }
  if (filters.type && VALID_TYPES.includes(filters.type)) where.type = filters.type;
  if (filters.status && VALID_STATUSES.includes(filters.status)) where.status = filters.status;
  if (filters.priority && VALID_PRIORITIES.includes(filters.priority)) where.priority = filters.priority;

  return prisma.activity.findMany({
    where,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
};

const create = async (userId, body) => {
  const { title, description, type, startTime, endTime, status, priority, linkUrl } = body;

  // ─── Defaults for optional-but-required-in-schema fields ──────────
  const source = VALID_SOURCES.includes(body.source) ? body.source : 'manual';
  const date = body.date ? new Date(body.date) : new Date(new Date().toDateString()); // today UTC midnight

  if (!title) throw new ApiError(400, 'VALIDATION_ERROR', 'title is required');
  if (!type) throw new ApiError(400, 'VALIDATION_ERROR', 'type is required');
  if (!VALID_TYPES.includes(type)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid activity type');
  if (status && !VALID_STATUSES.includes(status)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid status');
  if (priority && !VALID_PRIORITIES.includes(priority)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid priority');

  const activity = await prisma.activity.create({
    data: {
      userId,
      title,
      description,
      type,
      date,
      startTime: startTime || null,
      endTime: endTime || null,
      status: VALID_STATUSES.includes(status) ? status : 'pending',
      priority: priority || null,
      linkUrl: linkUrl || null,
      source,
    },
  });

  await createLog(userId, activity.id, 'created');
  return activity;
};


const getOne = async (userId, activityId) => {
  return assertOwnership(userId, activityId);
};

const update = async (userId, activityId, body) => {
  await assertOwnership(userId, activityId);

  const { title, description, type, date, startTime, endTime, status, priority, linkUrl } = body;

  if (type && !VALID_TYPES.includes(type)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid type');
  if (status && !VALID_STATUSES.includes(status)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid status');
  if (priority && !VALID_PRIORITIES.includes(priority)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid priority');

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(linkUrl !== undefined && { linkUrl }),
    },
  });

  await createLog(userId, activityId, 'updated');
  await syncTodayStreak(userId, updated.date);
  return updated;
};

const remove = async (userId, activityId) => {
  await assertOwnership(userId, activityId);

  // Delete logs first (referenced by activityId)
  await prisma.activityLog.deleteMany({ where: { activityId } });
  await prisma.activity.delete({ where: { id: activityId } });
};

const updateStatus = async (userId, activityId, status) => {
  if (!status || !VALID_STATUSES.includes(status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  await assertOwnership(userId, activityId);

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: { status },
  });

  // Map status -> log action
  const actionMap = { done: 'completed', skipped: 'skipped', pending: 'updated' };
  await createLog(userId, activityId, actionMap[status] || 'updated');

  //ini buat gamifikasi, kalo statusnya done updateStreak
  await syncTodayStreak(userId, updated.date);

  return updated;
};

module.exports = { list, create, getOne, update, remove, updateStatus };
