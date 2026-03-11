'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const activityController = require('./activity.controller');

// All routes are protected
router.use(auth);

router.get('/', activityController.list);
router.post('/', activityController.create);
router.get('/:id', activityController.getOne);
router.put('/:id', activityController.update);
router.delete('/:id', activityController.remove);
router.patch('/:id/status', activityController.updateStatus);

module.exports = router;
