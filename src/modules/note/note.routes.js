'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const noteController = require('./note.controller');

router.use(auth);

router.get('/', noteController.list);
router.post('/', noteController.create);
router.get('/:id', noteController.getOne);
router.put('/:id', noteController.update);
router.delete('/:id', noteController.remove);
router.patch('/:id/pin', noteController.togglePin);

module.exports = router;
