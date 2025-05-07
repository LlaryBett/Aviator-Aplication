const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { initiateDeposit, handleCallback } = require('../controllers/mpesaController');

router.post('/stk', auth, initiateDeposit);
router.post('/callback', handleCallback);

module.exports = router;
