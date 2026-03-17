'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/apiError');

const SALT_ROUNDS = 12;

const changePassword = async (userId, { oldPassword, newPassword, confirmNewPassword }) => {
  // ── Validation ──
  if (!oldPassword || !newPassword || !confirmNewPassword) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Password lama, password baru, dan konfirmasi wajib diisi');
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Password baru minimal 8 karakter');
  }

  if (newPassword !== confirmNewPassword) {
    throw new ApiError(400, 'PASSWORD_MISMATCH', 'Password baru dan konfirmasi tidak sama');
  }

  // ── Find user ──
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User tidak ditemukan');
  }

  // ── Verify old password ──
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, 'INVALID_CREDENTIALS', 'Password lama salah');
  }

  // ── Hash new password & Update ──
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return true;
};

// ─── Fitur CRUD Baru ──────────────────────────────────────────────

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    // Jangan return password ke frontend
    select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
  });

  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User tidak ditemukan');
  return user;
};

const updateProfile = async (userId, body) => {
  const { name, email } = body;

  // Jika user mencoba mengubah email, pastikan email tidak bentrok dengan user lain
  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      throw new ApiError(409, 'CONFLICT', 'Email sudah digunakan oleh pengguna lain');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(email && { email }),
    },
    select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
  });

  return updatedUser;
};

const deleteAccount = async (userId) => {
  // Prisma akan otomatis menghapus semua activities, notes, logs, dll milik user ini!
  await prisma.user.delete({ 
    where: { id: userId } 
  });

  return true;
};

module.exports = { changePassword, getProfile, updateProfile, deleteAccount };