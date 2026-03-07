'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const activityLogController = require('./activityLog.controller');

router.use(auth);

router.get('/', activityLogController.list);
router.get('/heatmap', activityLogController.getHeatmap);

module.exports = router;
