const express = require('express');
const pitchController = require('../controllers/pitchController');

const router = express.Router();

router.get('/', pitchController.getAll.bind(pitchController));

module.exports = router;
