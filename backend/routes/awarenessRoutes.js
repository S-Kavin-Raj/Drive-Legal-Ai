const express = require('express')
const {
  evaluateAwarenessScore,
  getAwarenessHistoryHandler,
  searchTrafficRules,
  handleTrafficAssistantChat
} = require('../controllers/awarenessController')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/evaluate', requireAuth, evaluateAwarenessScore)
router.get('/history/:userId', requireAuth, getAwarenessHistoryHandler)
router.get('/rules/search', requireAuth, searchTrafficRules)
router.post('/chat', requireAuth, handleTrafficAssistantChat)

module.exports = router
