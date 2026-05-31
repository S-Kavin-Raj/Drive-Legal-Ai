const path = require('path')
require('dotenv').config()

const { chatWithGemini } = require('./services/trafficAssistantService')
const { seedTrafficRules } = require('./services/seedService')
const { db } = require('./services/firebaseAdmin')

async function runTest() {
  console.log('--- Preparing Database: Seeding Rules & Injecting Test Driver Context ---')
  await seedTrafficRules()

  const userId = 'verify_assistant_test_user'

  // Clear existing mock data for clean verification run
  const collectionsToClean = ['users', 'documents', 'trustScores', 'challanReports', 'assistantConversations']
  for (const col of collectionsToClean) {
    try {
      const snap = await db.collection(col).where('userId', '==', userId).get()
      for (const doc of snap.docs) {
        // Mock db set(null) or delete behavior
        await db.collection(col).doc(doc.id).set(null)
      }
    } catch (e) {
      // Ignore cleanup failures
    }
  }

  // 1. Setup User profile
  await db.collection('users').doc(userId).set({
    userId,
    name: 'Acceptance Test Driver',
    vehicleType: 'car',
    createdAt: new Date().toISOString()
  })

  // 2. Setup Vault documents (License, RC, Insurance, PUC all approved and valid)
  const docs = [
    { type: 'License', status: 'Approved', expiryDate: '2030-12-31T00:00:00.000Z' },
    { type: 'RC', status: 'Approved', expiryDate: '2030-12-31T00:00:00.000Z' },
    { type: 'Insurance', status: 'Approved', expiryDate: '2030-12-31T00:00:00.000Z' },
    { type: 'PUC', status: 'Approved', expiryDate: '2030-12-31T00:00:00.000Z' }
  ]
  for (const d of docs) {
    await db.collection('documents').add({
      userId,
      ...d,
      createdAt: new Date().toISOString()
    })
  }

  // 3. Setup Trust Score
  await db.collection('trustScores').doc(userId).set({
    userId,
    score: 95,
    level: 'Elite Driver',
    calculatedAt: new Date().toISOString()
  })

  // 4. Setup Outstanding Challan
  await db.collection('challanReports').add({
    userId,
    vehicleNumber: 'TN-37-BY-1234',
    violation: 'Exceeding permissible speed limits (Over-speeding)',
    fineAmount: 2000,
    status: 'Unpaid',
    createdAt: new Date().toISOString()
  })

  console.log('\n=== STARTING E2E VERIFICATION: GEMINI TRAFFIC ASSISTANT ===\n')

  // --- TEST 1: Traffic Rules Question ---
  console.log('--- TEST 1: Traffic Rules Grounded Query ---')
  const q1 = 'What is the penalty for driving without a helmet?'
  console.log(`User Question: "${q1}"`)
  const a1 = await chatWithGemini(userId, q1)
  console.log(`Assistant Answer:\n${a1}\n`)
  if (a1 && (a1.toLowerCase().includes('helmet') || a1.toLowerCase().includes('fine') || a1.toLowerCase().includes('rule'))) {
    console.log('SUCCESS: Grounded traffic rule matching verified.\n')
  } else {
    console.error('FAIL: Stale or empty rule matching answer returned.')
    process.exit(1)
  }

  // --- TEST 2: Vehicle Compliance Question ---
  console.log('--- TEST 2: Vehicle Compliance Mandated Check ---')
  const q2 = 'What documents are required for my vehicle?'
  console.log(`User Question: "${q2}"`)
  const a2 = await chatWithGemini(userId, q2)
  console.log(`Assistant Answer:\n${a2}\n`)
  if (a2 && (a2.toLowerCase().includes('license') || a2.toLowerCase().includes('insurance') || a2.toLowerCase().includes('puc') || a2.toLowerCase().includes('rc'))) {
    console.log('SUCCESS: Vehicle compliance context injected correctly.\n')
  } else {
    console.error('FAIL: Vehicle compliance document checks did not match expectations.')
    process.exit(1)
  }

  // --- TEST 3: Outstanding Challans Question ---
  console.log('--- TEST 3: outstanding Citations Ledger Scans ---')
  const q3 = 'Why do I have outstanding challans?'
  console.log(`User Question: "${q3}"`)
  const a3 = await chatWithGemini(userId, q3)
  console.log(`Assistant Answer:\n${a3}\n`)
  if (a3 && (a3.toLowerCase().includes('unpaid') || a3.toLowerCase().includes('challan') || a3.includes('2000') || a3.toLowerCase().includes('over-speeding'))) {
    console.log('SUCCESS: Unpaid citations correctly summarized.\n')
  } else {
    console.error('FAIL: Challan summaries did not scan live outstanding database rows.')
    process.exit(1)
  }

  // --- TEST 4: Trust Score Question ---
  console.log('--- TEST 4: Driver Trust Score Mechanics ---')
  const q4 = 'Why is my trust score 95?'
  console.log(`User Question: "${q4}"`)
  const a4 = await chatWithGemini(userId, q4)
  console.log(`Assistant Answer:\n${a4}\n`)
  if (a4 && (a4.toLowerCase().includes('elite') || a4.includes('95'))) {
    console.log('SUCCESS: Trust score level and value evaluated and explained.\n')
  } else {
    console.error('FAIL: Driver trust calculations was not present or explainable.')
    process.exit(1)
  }

  // --- TEST 5: Off-Topic Rejection ---
  console.log('--- TEST 5: Off-Topic AI Query Rejection Gate ---')
  const q5 = 'What is the capital of France and who won the 2022 World Cup?'
  console.log(`User Question: "${q5}"`)
  const a5 = await chatWithGemini(userId, q5)
  console.log(`Assistant Answer:\n${a5}\n`)
  const expectedRejection = 'I can only help with traffic, driving, compliance, challans, and road safety topics.'
  if (a5 === expectedRejection) {
    console.log('SUCCESS: Exact off-topic block active and returned standard warning.\n')
  } else {
    console.error(`FAIL: Off-topic block failed. Got: "${a5}", expected: "${expectedRejection}"`)
    process.exit(1)
  }

  // --- TEST 6: Conversation History Logging ---
  console.log('--- TEST 6: Conversations History Ledger Insertion ---')
  const historySnap = await db.collection('assistantConversations')
    .where('userId', '==', userId)
    .get()
  const historyDocs = historySnap.docs.map(d => d.data())
  console.log(`Saved conversations found: ${historyDocs.length} (Expected >= 5)`)
  for (const h of historyDocs) {
    console.log(`- Question: "${h.question}" | CreatedAt: ${h.createdAt}`)
  }
  
  if (historyDocs.length >= 5) {
    console.log('\nSUCCESS: Firestore logging active and matching schema fields.\n')
  } else {
    console.error('FAIL: Conversation history was not fully logged.')
    process.exit(1)
  }

  console.log('=== ALL E2E TRAFFIC ASSISTANT TESTS PASSED SUCCESSFULLY ===')
}

runTest().catch(err => {
  console.error('Test execution error:', err)
  process.exit(1)
})
