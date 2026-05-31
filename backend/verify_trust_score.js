const path = require('path')
require('dotenv').config()
const { db } = require('./services/firebaseAdmin')
const { recalculateUserTrustScore } = require('./services/trustScoreEngine')

async function runTest() {
  console.log('=== STARTING DRIVER TRUST SCORE CALCULATIONS VERIFICATION ===\n')

  const testUserId = 'qa-trust-driver-999'

  // Helper clean-up function
  async function cleanup() {
    const collections = ['users', 'documents', 'challanReports', 'drivingSessions', 'drivingEvents', 'notifications', 'trustScores', 'trustScoreHistory']
    for (const col of collections) {
      const snap = await db.collection(col).where('userId', '==', testUserId).get()
      for (const d of snap.docs) {
        await db.collection(col).doc(d.id).delete()
      }
    }
    // Delete user profile direct doc
    await db.collection('users').doc(testUserId).delete()
    await db.collection('trustScores').doc(testUserId).delete()
  }

  await cleanup()

  try {
    // --- SCENARIO 1: PERFECT DRIVER ---
    console.log('--- SCENARIO 1: Perfect Driver (100% compliance, 1 session completed, 0 challans) ---')
    
    // Seed user profile
    await db.collection('users').doc(testUserId).set({
      userId: testUserId,
      vehicleType: 'car',
      onboardingCompleted: true
    })

    // Seed 4 valid required documents
    const docTypes = ['license', 'rc', 'insurance', 'puc']
    const yearFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    for (const type of docTypes) {
      await db.collection('documents').add({
        userId: testUserId,
        type,
        expiryDate: yearFuture,
        status: 'Valid',
        uploadedAt: new Date().toISOString()
      })
    }

    // Seed 1 completed driving session
    await db.collection('drivingSessions').add({
      userId: testUserId,
      status: 'Completed',
      createdAt: new Date().toISOString()
    })

    // Run Recalculation
    let trustData = await recalculateUserTrustScore(testUserId)

    console.log(`- Calculated Trust Score: ${trustData.score}/100`)
    console.log(`- Tier Assigned: "${trustData.level}"`)
    console.log(`- Earned Badges:`, trustData.achievements.map(a => a.title))
    
    if (trustData.score >= 90 && trustData.level === 'Elite Driver') {
      console.log('SUCCESS: Perfect driver computed as Elite. ✅')
    } else {
      throw new Error(`FAIL: Expected Elite Driver (score >= 90). Got score: ${trustData.score}, level: ${trustData.level}`)
    }

    // --- SCENARIO 2: MISSING DOCUMENTS ---
    console.log('\n--- SCENARIO 2: Missing Documents (PUC and RC missing/expired) ---')
    // Remove RC and PUC documents to trigger missing penalties
    const docSnap = await db.collection('documents').where('userId', '==', testUserId).get()
    for (const d of docSnap.docs) {
      const docType = d.data().type
      if (docType === 'puc' || docType === 'rc') {
        await db.collection('documents').doc(d.id).delete()
      }
    }

    trustData = await recalculateUserTrustScore(testUserId)
    console.log(`- Calculated Trust Score (Missing Docs): ${trustData.score}/100`)
    console.log(`- Primary Negative Factors:`, trustData.factors.negative)
    
    if (trustData.score < 90) {
      console.log('SUCCESS: Missing document penalty successfully reduced score. ✅')
    } else {
      throw new Error('FAIL: Missing documents did not lower the trust score below 90!')
    }

    // --- SCENARIO 3: OVERDUE CHALLAN ---
    console.log('\n--- SCENARIO 3: Active Overdue Challan Penalisations ---')
    // Seed 1 unpaid overdue challan
    await db.collection('challanReports').add({
      userId: testUserId,
      vehicleNumber: 'TN38AB5678',
      violation: 'Exceeding permissible speed limits (Over-speeding)',
      fineAmount: 2000,
      challanDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Overdue',
      severity: 'Medium'
    })

    trustData = await recalculateUserTrustScore(testUserId)
    console.log(`- Calculated Trust Score (Overdue Challan): ${trustData.score}/100`)
    console.log(`- Primary Negative Factors:`, trustData.factors.negative)

    if (trustData.factors.negative.some(f => f.includes('Overdue challan'))) {
      console.log('SUCCESS: Overdue challan penalty successfully registered in factors list. ✅')
    } else {
      throw new Error('FAIL: Overdue challan not found in negative factors list!')
    }

    // --- SCENARIO 4: REPEAT VIOLATION FLAG ---
    console.log('\n--- SCENARIO 4: Repeat Violations Active Penalisations ---')
    // Set repeatOffender flag to true on the challan
    const chalSnap = await db.collection('challanReports').where('userId', '==', testUserId).get()
    for (const d of chalSnap.docs) {
      await db.collection('challanReports').doc(d.id).update({
        repeatOffender: true
      })
    }

    trustData = await recalculateUserTrustScore(testUserId)
    console.log(`- Calculated Trust Score (Repeat Offender): ${trustData.score}/100`)
    console.log(`- Primary Negative Factors:`, trustData.factors.negative)

    if (trustData.factors.negative.some(f => f.includes('Repeat offender'))) {
      console.log('SUCCESS: Repeat offender penalty logged and deducted. ✅')
    } else {
      throw new Error('FAIL: Repeat offender flag not logged in negative factors list!')
    }

    // --- SCENARIO 5: MIXED EXTREME COMPRESSION SCENARIO ---
    console.log('\n--- SCENARIO 5: Clamping Boundaries & History Verification ---')
    // Add multiple additional overdue critical severity challans and off-route events to force clamped score to exactly 0
    await db.collection('drivingEvents').add({
      userId: testUserId,
      type: 'OFF_ROUTE',
      message: 'Deviated 500m.',
      createdAt: new Date().toISOString()
    })
    await db.collection('drivingEvents').add({
      userId: testUserId,
      type: 'OFF_ROUTE',
      message: 'Deviated 500m again.',
      createdAt: new Date().toISOString()
    })

    for (let i = 0; i < 5; i++) {
      await db.collection('challanReports').add({
        userId: testUserId,
        status: 'Overdue',
        severity: 'Critical',
        fineAmount: 9000,
        challanDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    trustData = await recalculateUserTrustScore(testUserId)
    console.log(`- Calculated Trust Score (Extremely Unsafe): ${trustData.score}/100`)
    console.log(`- Clamped Tier: "${trustData.level}"`)

    if (trustData.score <= 55 && (trustData.level === 'Risk Driver' || trustData.level === 'High Risk Driver')) {
      console.log('SUCCESS: High penalty density successfully compresses score to Risk Driver tier. ✅')
    } else {
      throw new Error(`FAIL: Expected clamped score in Risk/High Risk tier (<= 55). Got: ${trustData.score}`)
    }

    // Assert History Collection
    const historySnap = await db.collection('trustScoreHistory').where('userId', '==', testUserId).get()
    console.log(`- Unlocked historical score logs count: ${historySnap.size}`)
    if (historySnap.size >= 1) {
      console.log('SUCCESS: Historical score change ledgers successfully synchronized. ✅')
    } else {
      throw new Error('FAIL: No historical logs found in trustScoreHistory!')
    }

    console.log('\n=== ALL PHASE 10 TRUST ENGINE VERIFICATION SCENARIOS PASSED ===')

  } finally {
    // Clean up
    console.log('\nCleaning up E2E test seeds...')
    await cleanup()
    console.log('Clean-up complete.')
  }
}

runTest().catch(err => {
  console.error('\nE2E Trust Engine verification failed:', err)
  process.exit(1)
})
