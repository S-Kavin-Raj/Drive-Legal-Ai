const path = require('path')
require('dotenv').config()
const { db } = require('./services/firebaseAdmin')

// Haversine formula in km
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

async function runTest() {
  console.log('=== STARTING FINAL DRIVING MODE V1 INTELLIGENCE & EVENT VERIFICATION ===\n')

  const testUserId = 'e2e-driver-user-888'
  const testRouteId = 'route_tiruppur_madurai_mock'
  const testSource = 'Tiruppur, TN, India'
  const testDestination = 'Madurai, TN, India'

  // --- PART 1: Session Creation (Step 8) ---
  console.log('--- TEST 1: Creating Driving Session in Firestore ---')
  const sessionPayload = {
    userId: testUserId,
    routeId: testRouteId,
    source: testSource,
    destination: testDestination,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: 'Active',
    distanceTravelled: 0,
    averageSpeed: 0,
    createdAt: new Date().toISOString()
  }

  const docRef = await db.collection('drivingSessions').add(sessionPayload)
  const sessionId = docRef.id
  console.log(`SUCCESS: Session document written. Session ID: ${sessionId}`)

  // Verify it exists and has source/destination
  const checkSnap = await db.collection('drivingSessions').doc(sessionId).get()
  if (checkSnap.exists) {
    console.log(`- Stored User ID: ${checkSnap.data().userId}`)
    console.log(`- Stored Source: "${checkSnap.data().source}"`)
    console.log(`- Stored Destination: "${checkSnap.data().destination}"`)
    console.log(`- Initial Status: ${checkSnap.data().status}`)
  } else {
    console.error('FAIL: Stored session could not be fetched!')
    process.exit(1)
  }

  // --- PART 2: Route Tracking, Progress & Haversine math (Step 4 & 6) ---
  console.log('\n--- TEST 2: Route Progress & Deviation Heuristics ---')
  
  // Planned Route Polyline coords
  const routeCoords = [
    [11.1085, 77.3411], // Tiruppur Junction
    [11.1120, 77.3430],
    [11.1150, 77.3450], // Coimbatore Public School crossing
    [11.1170, 77.3465]
  ]

  // Mock Position 1: Extremely close to path (within 20 meters)
  const currentPos1 = [11.1121, 77.3431] 
  let minDistance1 = Infinity
  routeCoords.forEach(c => {
    const dist = getDistanceKm(currentPos1[0], currentPos1[1], c[0], c[1])
    if (dist < minDistance1) minDistance1 = dist
  })
  
  const minDistance1Meters = minDistance1 * 1000
  console.log(`- Telemetry Position 1: [${currentPos1.join(', ')}]`)
  console.log(`- Closest planned route segment distance: ${minDistance1Meters.toFixed(1)} meters`)
  console.log(`- Off-Route Alert Status: ${minDistance1Meters > 200 ? 'ACTIVE ⚠️' : 'CLEARED ✅'} (Expected: CLEARED)`)
  if (minDistance1Meters > 200) {
    console.error('FAIL: Position 1 falsely triggered off-route!')
    process.exit(1)
  }

  // Mock Position 2: Shifted / Deviated position (350 meters away)
  const currentPos2 = [11.1140, 77.3485]
  let minDistance2 = Infinity
  routeCoords.forEach(c => {
    const dist = getDistanceKm(currentPos2[0], currentPos2[1], c[0], c[1])
    if (dist < minDistance2) minDistance2 = dist
  })

  const minDistance2Meters = minDistance2 * 1000
  console.log(`- Telemetry Position 2: [${currentPos2.join(', ')}]`)
  console.log(`- Closest planned route segment distance: ${minDistance2Meters.toFixed(1)} meters`)
  console.log(`- Off-Route Alert Status: ${minDistance2Meters > 200 ? 'ACTIVE ⚠️' : 'CLEARED ✅'} (Expected: ACTIVE)`)
  
  // --- PART 3: Driving Events Logging (Step 9) ---
  console.log('\n--- TEST 3: Driving Events Logging Heuristics ---')
  if (minDistance2Meters > 200) {
    console.log('- Deviation Detected. Logging critical event "OFF_ROUTE"...')
    const eventPayload = {
      sessionId: sessionId,
      userId: testUserId,
      type: 'OFF_ROUTE',
      message: `Vehicle deviated ${minDistance2Meters.toFixed(0)}m from route vector.`,
      createdAt: new Date().toISOString()
    }
    const eventRef = await db.collection('drivingEvents').add(eventPayload)
    console.log(`SUCCESS: Event document written. Event ID: ${eventRef.id}`)
  } else {
    console.error('FAIL: Position 2 failed to trigger off-route deviation warning!')
    process.exit(1)
  }

  // Verify drivingEvents collection
  const eventsSnap = await db.collection('drivingEvents')
    .where('sessionId', '==', sessionId)
    .where('type', '==', 'OFF_ROUTE')
    .get()
  
  if (!eventsSnap.empty) {
    console.log(`- Stored Event count for Session: ${eventsSnap.size}`)
    const loggedEvent = eventsSnap.docs[0].data()
    console.log(`  * Event Type: ${loggedEvent.type}`)
    console.log(`  * Event Message: "${loggedEvent.message}"`)
    console.log(`  * Event Timestamp: ${loggedEvent.createdAt}`)
  } else {
    console.error('FAIL: Stored driving event could not be retrieved!')
    process.exit(1)
  }

  // --- PART 4: Session Completion (Step 10) ---
  console.log('\n--- TEST 4: Persisting Stopped Driving Session ---')
  const finalDistance = 182.3 // km
  const finalAvgSpeed = 70 // km/h

  await db.collection('drivingSessions').doc(sessionId).update({
    endedAt: new Date().toISOString(),
    status: 'Completed',
    distanceTravelled: finalDistance,
    averageSpeed: Math.round(finalAvgSpeed)
  })

  const closedSnap = await db.collection('drivingSessions').doc(sessionId).get()
  console.log('SUCCESS: Session document updated.')
  console.log(`- Final Status: ${closedSnap.data().status}`)
  console.log(`- Final Distance: ${closedSnap.data().distanceTravelled} km`)
  console.log(`- Average Speed: ${closedSnap.data().averageSpeed} km/h`)
  console.log(`- Duration logged: Yes (endedAt: ${closedSnap.data().endedAt})`)

  console.log('\n=== ALL DRIVING MODE V1 PRODUCTION TESTS PASSED SUCCESSFULLY ===')
}

runTest().catch(err => {
  console.error('E2E Driving Mode Production Test failure:', err)
  process.exit(1)
})
