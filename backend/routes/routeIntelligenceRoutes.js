const express = require('express')
const { evaluateRouteIntelligence } = require('../controllers/routeIntelligenceController')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/evaluate', requireAuth, evaluateRouteIntelligence)

module.exports = router
