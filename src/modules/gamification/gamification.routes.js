'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const gamificationController = require('./gamification.controller');

// Wajib login untuk akses endpoint ini
router.use(auth);

// GET /api/gamification
router.get('/', gamificationController.getGamification);

module.exports = router;