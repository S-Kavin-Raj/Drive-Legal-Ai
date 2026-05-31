const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sweepDocumentExpiries
} = require('../controllers/notificationController')

const router = express.Router()

router.get('/', requireAuth, getNotifications)
router.post('/:id/read', requireAuth, markNotificationAsRead)
router.post('/mark-all-read', requireAuth, markAllNotificationsAsRead)
router.post('/refresh-expiry', requireAuth, sweepDocumentExpiries)

module.exports = router
