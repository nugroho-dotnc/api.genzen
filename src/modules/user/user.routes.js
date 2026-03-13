'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const userController = require('./user.controller');

// Semua route di dalam modul user akan diproteksi oleh auth middleware
router.use(auth);

router.patch('/change-password', userController.changePassword);

module.exports = router;