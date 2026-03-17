'use strict';

const userService = require('./user.service');
const { sendSuccess } = require('../../utils/response');

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    await userService.changePassword(req.user.id, { oldPassword, newPassword, confirmNewPassword });
    return sendSuccess(res, null, 'Password berhasil diubah');
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const data = await userService.getProfile(req.user.id);
    return sendSuccess(res, data, 'Profil berhasil diambil');
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const data = await userService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, data, 'Profil berhasil diperbarui');
  } catch (err) {
    next(err);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    await userService.deleteAccount(req.user.id);
    return sendSuccess(res, null, 'Akun beserta semua data berhasil dihapus');
  } catch (err) {
    next(err);
  }
};

module.exports = { changePassword, getProfile, updateProfile, deleteAccount };