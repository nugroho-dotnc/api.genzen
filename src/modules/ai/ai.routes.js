'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const aiController = require('./ai.controller');

router.use(auth);

// POST /api/ai/parse — send a user prompt and receive structured activity/note preview data
router.post('/parse', aiController.parse);

module.exports = router;
