'use strict';

const prisma = require('../../config/prisma');
const ApiError = require('../../utils/apiError');

// ─── Helpers ──────────────────────────────────────────────────────

const assertOwnership = async (userId, categoryId) => {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new ApiError(404, 'NOT_FOUND', 'Category not found');
  if (category.userId !== userId) throw new ApiError(403, 'FORBIDDEN', 'Access denied');
  return category;
};

// ─── Service Functions ────────────────────────────────────────────

const list = async (userId) => {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }, // Mengurutkan dari yang terbaru
  });
};

const create = async (userId, body) => {
  const { name, color } = body;

  if (!name) throw new ApiError(400, 'VALIDATION_ERROR', 'name is required');

  try {
    const category = await prisma.category.create({
      data: {
        userId,
        name,
        color: color || null,
      },
    });
    return category;
  } catch (error) {
    // Menangkap error unique constraint (karena 1 user tidak boleh punya 2 kategori dengan nama sama)
    if (error.code === 'P2002') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Category name already exists for this user');
    }
    throw error;
  }
};

const getOne = async (userId, categoryId) => {
  return assertOwnership(userId, categoryId);
};

const update = async (userId, categoryId, body) => {
  await assertOwnership(userId, categoryId);

  const { name, color } = body;

  try {
    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
      },
    });
    return updated;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Category name already exists for this user');
    }
    throw error;
  }
};

const remove = async (userId, categoryId) => {
  await assertOwnership(userId, categoryId);

  // Jika relasi ke Note diset onDelete: SetNull, notes tidak akan terhapus.
  // Jika diset onDelete: Cascade, notes yang pakai kategori ini otomatis terhapus.
  await prisma.category.delete({ where: { id: categoryId } });
};

module.exports = { list, create, getOne, update, remove };