const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { getTrustScore, recalculateTrustScore } = require('../controllers/trustScoreController')

const router = express.Router()

router.get('/', requireAuth, getTrustScore)
router.post('/recalculate', requireAuth, recalculateTrustScore)

module.exports = router
