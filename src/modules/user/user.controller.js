'use strict';

const userService = require('./user.service');
const { sendSuccess } = require('../../utils/response');

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    // req.user.id didapat dari middleware auth
    await userService.changePassword(req.user.id, { oldPassword, newPassword, confirmNewPassword });
    return sendSuccess(res, null, 'Password berhasil diubah');
  } catch (err) {
    next(err);
  }
};

module.exports = { changePassword };