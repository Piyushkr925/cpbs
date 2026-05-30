const express = require('express');
const slotController = require('../controllers/slotController');

const router = express.Router();

router.get('/', slotController.getSlots.bind(slotController));

module.exports = router;
