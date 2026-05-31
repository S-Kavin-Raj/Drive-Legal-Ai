const path = require('path')
require('dotenv').config()
const { db } = require('./services/firebaseAdmin')
const { sweepDocumentExpiries, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } = require('./controllers/notificationController')

async function runTest() {
  console.log('=== STARTING NOTIFICATION ENGINE & CHALLAN ENHANCEMENTS VERIFICATION ===\n')

  const testUserId = 'qa-notif-driver-888'

  // Clean up any lingering test records first
  async function cleanup() {
    const collections = ['users', 'documents', 'challanReports', 'notifications']
    for (const col of collections) {
      const snap = await db.collection(col).where('userId', '==', testUserId).get()
      for (const d of snap.docs) {
        await db.collection(col).doc(d.id).delete()
      }
    }
    // Also delete user doc where key is the id
    await db.collection('users').doc(testUserId).delete()
  }

  await cleanup()

  try {
    // --- 1. SEED TEST PROFILE ---
    console.log('Step 1: Seeding Test Profile (vehicleType: "car")...')
    await db.collection('users').doc(testUserId).set({
      userId: testUserId,
      vehicleType: 'car',
      onboardingCompleted: true,
      settings: {
        notificationsEnabled: true
      }
    })

    // --- 2. SEED EXPIRED & EXPIRING DOCUMENTS ---
    console.log('\nStep 2: Seeding documents (Insurance expiring in 15 days, License expired)...')
    const now = new Date()
    
    // 15 days in future
    const exp15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
    const exp15Str = exp15.toISOString().split('T')[0]

    // 5 days in past (expired)
    const expPast = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
    const expPastStr = expPast.toISOString().split('T')[0]

    await db.collection('documents').add({
      userId: testUserId,
      type: 'insurance',
      expiryDate: exp15Str,
      status: 'Valid',
      uploadedAt: new Date().toISOString()
    })

    await db.collection('documents').add({
      userId: testUserId,
      type: 'license',
      expiryDate: expPastStr,
      status: 'Expired',
      uploadedAt: new Date().toISOString()
    })

    // --- 3. SEED UNPAID CHALLANS (Overdue and Due Soon) ---
    console.log('\nStep 3: Seeding unpaid challans (1 over-due, 1 pending/due)...')
    // Challan date 35 days ago (already overdue)
    const challanOverdueDate = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000)
    const challanOverdueDoc = await db.collection('challanReports').add({
      userId: testUserId,
      vehicleNumber: 'TN38AL1234',
      violation: 'Driving without protective headgear (No Helmet)',
      fineAmount: 1000,
      challanDate: challanOverdueDate.toISOString(),
      status: 'Pending',
      daysRemaining: 30
    })

    // --- 4. EXECUTE SWEEP OPERATION ---
    console.log('\nStep 4: Executing Notification Engine Expiry Sweep...')
    
    // Simulate Request/Response for Sweep controller
    let sweepSuccess = false
    const mockReq = {
      user: { userId: testUserId }
    }
    const mockRes = {
      json: (data) => {
        if (data && data.success) sweepSuccess = true
      },
      status: (code) => ({
        json: (err) => console.error('Sweep status error:', code, err)
      })
    }

    await sweepDocumentExpiries(mockReq, mockRes)

    if (sweepSuccess) {
      console.log('SUCCESS: Expiry sweep executed.')
    } else {
      throw new Error('FAIL: Sweep operation failed to return success.')
    }

    // --- 5. ASSERT GENERATED NOTIFICATIONS ---
    console.log('\nStep 5: Querying generated notifications...')
    let fetchedList = []
    const mockGetRes = {
      json: (data) => {
        fetchedList = data.notifications || []
      },
      status: (code) => ({
        json: (err) => console.error('Get status error:', code, err)
      })
    }

    await getNotifications(mockReq, mockGetRes)

    console.log(`- Retrieved ${fetchedList.length} notifications:`)
    fetchedList.forEach(n => {
      console.log(`  * [Type: ${n.type}] "${n.title}": ${n.message} (isRead: ${n.isRead})`)
    })

    // Assert milestones
    const types = fetchedList.map(n => n.type)
    const hasExp15 = types.some(t => t.startsWith('EXPIRY_insurance_15'))
    const hasExpired = types.some(t => t.startsWith('EXPIRY_license_EXPIRED'))
    const hasChallanOverdue = types.some(t => t.startsWith('CHALLAN_OVERDUE'))

    if (hasExp15 && hasExpired) {
      console.log('SUCCESS: Document milestones correct (Insurance 15d soon + License expired). ✅')
    } else {
      throw new Error(`FAIL: Missing document notifications! Found: ${types.join(', ')}`)
    }

    if (hasChallanOverdue) {
      console.log('SUCCESS: Challan status transitioned and notification created correctly. ✅')
    } else {
      throw new Error(`FAIL: Missing challan notifications! Found: ${types.join(', ')}`)
    }

    // --- 6. TEST MARK AS READ ---
    console.log('\nStep 6: Testing mark individual notification as read...')
    const targetNotif = fetchedList[0]
    let readSuccess = false
    const mockReadReq = {
      params: { id: targetNotif.id }
    }
    const mockReadRes = {
      json: (data) => {
        if (data && data.success) readSuccess = true
      },
      status: (code) => ({
        json: (err) => console.error('Read status error:', code, err)
      })
    }

    await markNotificationAsRead(mockReadReq, mockReadRes)

    if (readSuccess) {
      const snap = await db.collection('notifications').doc(targetNotif.id).get()
      if (snap.exists && snap.data().isRead === true) {
        console.log(`SUCCESS: Notification "${targetNotif.title}" marked as read. ✅`)
      } else {
        throw new Error('FAIL: Firestore was not updated with isRead: true.')
      }
    } else {
      throw new Error('FAIL: markNotificationAsRead controller did not return success.')
    }

    // --- 7. TEST MARK ALL AS READ ---
    console.log('\nStep 7: Testing mark all notifications as read...')
    let markAllSuccess = false
    const mockAllRes = {
      json: (data) => {
        if (data && data.success) markAllSuccess = true
      },
      status: (code) => ({
        json: (err) => console.error('Mark all status error:', code, err)
      })
    }

    await markAllNotificationsAsRead(mockReq, mockAllRes)

    if (markAllSuccess) {
      const snap = await db.collection('notifications').where('userId', '==', testUserId).get()
      const allRead = snap.docs.every(d => d.data().isRead === true)
      if (allRead) {
        console.log('SUCCESS: All notifications marked as read in Firestore. ✅')
      } else {
        throw new Error('FAIL: Not all notifications were marked as read.')
      }
    } else {
      throw new Error('FAIL: markAllNotificationsAsRead controller did not return success.')
    }

    console.log('\n=== ALL PHASE 9 ACCEPTANCE TESTS PASSED Cleanly ===')

  } finally {
    // --- 8. CLEAN UP ---
    console.log('\nStep 8: Cleaning up test seeds...')
    await cleanup()
    console.log('Test clean-up complete.')
  }
}

runTest().catch(err => {
  console.error('\nE2E Verification threw exception:', err)
  process.exit(1)
})
