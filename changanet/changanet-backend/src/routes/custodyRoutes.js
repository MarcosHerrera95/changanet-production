// src/routes/custodyRoutes.js
const express = require('express');
const { createCustody, releaseCustody, getCustodyStatus } = require('../controllers/custodyController');

const router = express.Router();

router.post('/', createCustody);
router.post('/:custodyId/release', releaseCustody);
router.get('/service/:serviceId', getCustodyStatus);

module.exports = router;
