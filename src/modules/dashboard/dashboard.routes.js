'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const dashboardController = require('./dashboard.controller');

// All routes are protected
router.use(auth);

router.get('/summary', dashboardController.summary);
router.get('/heatmap', dashboardController.heatmap);

module.exports = router;
