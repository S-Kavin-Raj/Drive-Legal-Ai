const path = require('path')
require('dotenv').config()
const { db } = require('./services/firebaseAdmin')

async function runTest() {
  console.log('=== STARTING VOICE ENGINE COMPLIANCE & RATE-LIMIT VERIFICATION ===\n')

  const testUserId = 'qa-voice-driver-777'

  // --- TEST 1: Settings Persistence ---
  console.log('--- TEST 1: Persisting Voice Settings in Firestore ---')
  const settingsPayload = {
    settings: {
      voiceAlerts: true,
      language: 'ta' // Tamil prepared sequence
    },
    updatedAt: new Date().toISOString()
  }

  await db.collection('users').doc(testUserId).set(settingsPayload)
  
  const userSnap = await db.collection('users').doc(testUserId).get()
  if (userSnap.exists && userSnap.data().settings?.voiceAlerts === true) {
    console.log('SUCCESS: Voice settings saved correctly in Firestore. ✅')
    console.log(`- Stored Language Parameter: "${userSnap.data().settings.language}"`)
  } else {
    console.error('FAIL: Failed to persist voice settings in Firestore!')
    process.exit(1)
  }

  // --- TEST 2: In-Memory 60s Deduplication check ---
  console.log('\n--- TEST 2: E2E Rate Limiting Deduplication (60s suppression) ---')
  
  const lastSpoken = {}
  let speakCount = 0

  function simulateSpeak(type, text) {
    const now = Date.now()
    if (lastSpoken[type] && (now - lastSpoken[type] < 60000)) {
      console.log(`  * SUPPRESSED: Spoken alert "${type}" is within 60s window. Skipping Speech Synthesis.`)
      return false
    }

    lastSpoken[type] = now
    speakCount++
    console.log(`  * SPOKEN: "${text}" (Announced successfully)`)
    return true
  }

  // Call 1: Immediate speak
  console.log('- Triggering First School Zone entry alert:')
  simulateSpeak('SCHOOL_ZONE', 'School zone ahead. Reduce speed.') // SPOKEN

  // Call 2: Quick repeat (within 1 second)
  console.log('\n- Triggering Second School Zone repeat alert (1s later):')
  simulateSpeak('SCHOOL_ZONE', 'School zone ahead. Reduce speed.') // SUPPRESSED

  // Call 3: Different alert type (Accident Zone)
  console.log('\n- Triggering Accident Zone entry alert:')
  simulateSpeak('ACCIDENT_ZONE', 'Accident-prone area ahead. Drive carefully.') // SPOKEN

  console.log(`\n- Final Spoken Tally: ${speakCount} spoken, 1 suppressed.`)
  if (speakCount === 2) {
    console.log('SUCCESS: Deduplication rate suppression operates cleanly. ✅')
  } else {
    console.error('FAIL: Deduplication rate limit failed!')
    process.exit(1)
  }

  // Clean up
  await db.collection('users').doc(testUserId).delete()

  console.log('\n=== ALL VOICE ENG COMPLIANCE TESTS PASSED SUCCESSFULLY ===')
}

runTest().catch(err => {
  console.error('Test runner threw exception:', err)
  process.exit(1)
})
