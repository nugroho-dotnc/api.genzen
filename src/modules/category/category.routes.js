'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const categoryController = require('./category.controller');

// All routes are protected
router.use(auth);

router.get('/', categoryController.list);
router.post('/', categoryController.create);
router.get('/:id', categoryController.getOne);
router.put('/:id', categoryController.update);
router.delete('/:id', categoryController.remove);

module.exports = router;