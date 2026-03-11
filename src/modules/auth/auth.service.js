'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/apiError');
const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
} = require('../../config/env');

const SALT_ROUNDS = 12;

// ─── Token Helpers ────────────────────────────────────────────────

const generateAccessToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });

const generateRefreshToken = (user) =>
  jwt.sign({ sub: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });

// ─── Service Functions ────────────────────────────────────────────

const register = async ({ name, email, password, confirmPassword }) => {
  // ── Validation ──
  if (!name || !email || !password || !confirmPassword) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'name, email, password, dan confirmPassword wajib diisi');
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Format email tidak valid');
  }

  if (password.length < 8) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Password minimal 8 karakter');
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, 'PASSWORD_MISMATCH', 'Password dan konfirmasi password tidak sama');
  }

  // ── Check duplicate email ──
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', 'Email sudah terdaftar');
  }

  // ── Hash & create ──
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,
    refreshToken,
  };
};

const login = async ({ email, password }) => {
  // ── Validation ──
  if (!email || !password) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'email dan password wajib diisi');
  }

  // ── Find user ──
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Gunakan pesan generik untuk mencegah email enumeration
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
  }

  // ── Verify password ──
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (token) => {
  if (!token) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'refreshToken wajib dikirim');
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'INVALID_TOKEN', 'Refresh token tidak valid atau sudah expired');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new ApiError(401, 'INVALID_TOKEN', 'User tidak ditemukan');
  }

  const accessToken = generateAccessToken(user);
  return { accessToken };
};

module.exports = { register, login, refreshToken };
