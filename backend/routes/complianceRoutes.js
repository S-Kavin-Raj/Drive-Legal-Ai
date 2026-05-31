const express = require('express')
const {
  evaluateCompliance,
  getComplianceHistory,
} = require('../controllers/complianceController')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/evaluate', requireAuth, evaluateCompliance)
router.get('/history/:userId', requireAuth, getComplianceHistory)

module.exports = router
