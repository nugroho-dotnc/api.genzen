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

// Opsional tapi penting: Helper untuk memastikan kategori yang dimasukkan benar-benar milik user tersebut
const validateCategoryOwnership = async (userId, categoryId) => {
  if (!categoryId) return;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.userId !== userId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid category ID');
  }
};

const list = async (userId, filters = {}) => {
  const where = { userId };
  if (filters.isPinned !== undefined) where.isPinned = filters.isPinned === 'true';
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.relatedDate) {
    const day = new Date(filters.relatedDate);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    where.relatedDate = { gte: day, lt: nextDay };
  }
  return prisma.note.findMany({ where, orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  include: { category: true } });
};

const create = async (userId, body) => {
  const { title, content, isPinned, relatedDate, source, categoryId, color } = body;
  if (!title || !content || !source) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'title, content, and source are required');
  }
  if (!VALID_SOURCES.includes(source)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid source');
  // Validasi apakah kategori valid dan milik user ini
  if (categoryId) {
    await validateCategoryOwnership(userId, categoryId);
  }

  return prisma.note.create({
    data: {
      userId,
      title,
      content,
      isPinned: isPinned ?? false,
      relatedDate: relatedDate ? new Date(relatedDate) : null,
      source,
      categoryId: categoryId || null, // -> Tambahan
      color: color || null,
    },
    include: { category: true }
  });
};

const getOne = async (userId, noteId) => {
  await assertOwnership(userId, noteId);
  // Ambil ulang dengan include category agar detailnya dapet
  return prisma.note.findUnique({
    where: { id: noteId },
    include: { category: true }
  });
};

const update = async (userId, noteId, body) => {
  await assertOwnership(userId, noteId);
 // Ekstrak categoryId dan color
  const { title, content, isPinned, relatedDate, categoryId, color } = body;

  // Validasi kategori baru jika user mencoba mengubah kategorinya
  if (categoryId !== undefined) {
    await validateCategoryOwnership(userId, categoryId);
  }

  return prisma.note.update({
    where: { id: noteId },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(isPinned !== undefined && { isPinned }),
      ...(relatedDate !== undefined && { relatedDate: relatedDate ? new Date(relatedDate) : null }),
      ...(categoryId !== undefined && { categoryId: categoryId === "" ? null : categoryId }), // Bisa set null jika user mau menghapus kategori dari notes ini
      ...(color !== undefined && { color }),
    },
    include: { category: true }
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
