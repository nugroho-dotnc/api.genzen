'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const userController = require('./user.controller');

// Semua route di dalam modul user akan diproteksi oleh auth middleware
router.use(auth);

// Rute CRUD Profil User
router.get('/me', userController.getProfile);          // (Read)   GET /api/users/me
router.put('/me', userController.updateProfile);       // (Update) PUT /api/users/me
router.delete('/me', userController.deleteAccount);    // (Delete) DELETE /api/users/me
router.patch('/change-password', userController.changePassword);

module.exports = router;