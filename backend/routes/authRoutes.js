const express = require('express')
const { syncSession } = require('../controllers/authController')

const router = express.Router()

router.post('/session', syncSession)

module.exports = router