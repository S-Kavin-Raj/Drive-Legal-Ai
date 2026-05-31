const { admin, db } = require('../services/firebaseAdmin')

const DOCUMENT_LABELS = {
  license: 'Driving License',
  rc: 'Registration Certificate (RC)',
  insurance: 'Insurance Certificate',
  puc: 'PUC Certificate',
  fc: 'Fitness Certificate (FC)'
}

async function getNotifications(req, res) {
  try {
    const userId = req.user?.userId || req.body?.userId
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    const snap = await db.collection('notifications')
      .where('userId', '==', userId)
      .get()

    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    return res.json({ notifications: list })
  } catch (error) {
    console.error('[getNotifications] Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch notifications.' })
  }
}

async function markNotificationAsRead(req, res) {
  try {
    const { id } = req.params
    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required.' })
    }

    await db.collection('notifications').doc(id).update({ isRead: true })
    return res.json({ success: true })
  } catch (error) {
    console.error('[markNotificationAsRead] Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to mark notification as read.' })
  }
}

async function markAllNotificationsAsRead(req, res) {
  try {
    const userId = req.user?.userId || req.body?.userId
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    const snap = await db.collection('notifications')
      .where('userId', '==', userId)
      .get()

    for (const doc of snap.docs) {
      if (!doc.data().isRead) {
        await db.collection('notifications').doc(doc.id).update({ isRead: true })
      }
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('[markAllNotificationsAsRead] Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to mark all as read.' })
  }
}

async function sweepDocumentExpiries(req, res) {
  try {
    const userId = req.user?.userId || req.body?.userId
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    // 1. Get user profile vehicleType
    let vehicleType = 'car'
    try {
      const userSnap = await db.collection('users').doc(userId).get()
      if (userSnap.exists) {
        vehicleType = userSnap.data().vehicleType || 'car'
      }
    } catch (err) {
      console.warn('[sweepDocumentExpiries] Could not get vehicle type:', err.message)
    }

    // 2. Query user's documents
    const docSnap = await db.collection('documents')
      .where('userId', '==', userId)
      .get()
    const documents = docSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Deduplicate documents by keeping the latest uploaded for each type
    const latestDocs = {}
    documents.forEach(doc => {
      const type = doc.type
      const existing = latestDocs[type]
      if (!existing) {
        latestDocs[type] = doc
      } else {
        const existingTime = existing.uploadedAt ? new Date(existing.uploadedAt.seconds ? existing.uploadedAt.seconds * 1000 : existing.uploadedAt).getTime() : 0
        const incomingTime = doc.uploadedAt ? new Date(doc.uploadedAt.seconds ? doc.uploadedAt.seconds * 1000 : doc.uploadedAt).getTime() : 0
        if (incomingTime >= existingTime) {
          latestDocs[type] = doc
        }
      }
    })

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Query current user notifications to prevent duplicates
    const notificationsSnap = await db.collection('notifications')
      .where('userId', '==', userId)
      .get()
    const existingNotificationTypes = new Set(notificationsSnap.docs.map(d => d.data().type))

    const milestones = [30, 15, 7, 1]

    for (const doc of Object.values(latestDocs)) {
      if (!doc.expiryDate) continue
      const docLabel = DOCUMENT_LABELS[doc.type] || doc.type.toUpperCase()
      const expiry = new Date(doc.expiryDate)
      expiry.setHours(0, 0, 0, 0)

      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiry <= 0) {
        // Expired
        const typeKey = `EXPIRY_${doc.type}_EXPIRED`
        if (!existingNotificationTypes.has(typeKey)) {
          await db.collection('notifications').add({
            userId,
            title: 'Document Expired',
            message: `Your ${docLabel} has expired. Renew it immediately to maintain compliance.`,
            type: typeKey,
            isRead: false,
            createdAt: new Date().toISOString()
          })
        }
      } else {
        // Expiring milestones
        for (const m of milestones) {
          if (daysUntilExpiry <= m) {
            const typeKey = `EXPIRY_${doc.type}_${m}`
            if (!existingNotificationTypes.has(typeKey)) {
              await db.collection('notifications').add({
                userId,
                title: `${docLabel} Expiring Soon`,
                message: `Your ${docLabel} is expiring in ${daysUntilExpiry} days (${doc.expiryDate}). Please renew it.`,
                type: typeKey,
                isRead: false,
                createdAt: new Date().toISOString()
              })
            }
          }
        }
      }
    }

    // 3. Sweep active challans for due statuses
    const challanSnap = await db.collection('challanReports')
      .where('userId', '==', userId)
      .get()

    for (const doc of challanSnap.docs) {
      const challan = { id: doc.id, ...doc.data() }
      if (challan.status === 'Paid') continue

      // Calculate current due dates
      const baseDate = new Date(challan.challanDate)
      const dueDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      dueDate.setHours(0, 0, 0, 0)

      const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      let computedStatus = 'Pending'
      if (daysRemaining < 0) {
        computedStatus = 'Overdue'
      } else if (daysRemaining <= 7) {
        computedStatus = 'Due Soon'
      }

      // Update status and days remaining in DB if changed
      if (challan.status !== computedStatus || challan.daysRemaining !== daysRemaining) {
        await db.collection('challanReports').doc(doc.id).update({
          status: computedStatus,
          daysRemaining
        })
      }

      // Trigger notification if due/overdue
      if (computedStatus === 'Overdue') {
        const typeKey = `CHALLAN_OVERDUE_${challan.id}`
        if (!existingNotificationTypes.has(typeKey)) {
          await db.collection('notifications').add({
            userId,
            title: 'Challan Overdue',
            message: `Payment for vehicle ${challan.vehicleNumber} (₹${challan.fineAmount}) is OVERDUE by ${Math.abs(daysRemaining)} days.`,
            type: typeKey,
            isRead: false,
            createdAt: new Date().toISOString()
          })
        }
      } else if (computedStatus === 'Due Soon') {
        const typeKey = `CHALLAN_DUE_${challan.id}`
        if (!existingNotificationTypes.has(typeKey)) {
          await db.collection('notifications').add({
            userId,
            title: 'Challan Due Soon',
            message: `Payment for vehicle ${challan.vehicleNumber} (₹${challan.fineAmount}) is due soon inside ${daysRemaining} days.`,
            type: typeKey,
            isRead: false,
            createdAt: new Date().toISOString()
          })
        }
      }
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('[sweepDocumentExpiries] Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to sweep document/challan expiries.' })
  }
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sweepDocumentExpiries
}
