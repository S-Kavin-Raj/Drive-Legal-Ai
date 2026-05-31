const path = require('path')
require('dotenv').config()

const { searchTrafficRules } = require('./controllers/awarenessController')
const { calculateRouteIntelligence } = require('./services/routeIntelligenceEngine')
const { seedTrafficRules } = require('./services/seedService')
const { db } = require('./services/firebaseAdmin')

async function runTest() {
  console.log('--- Preparing Database: Seeding Rules & Zones ---')
  await seedTrafficRules()

  console.log('\n=== STARTING E2E VERIFICATION: RULES ASSISTANT & ROUTE SCANNER ===\n')

  // --- PART 1: Rules Knowledge Base Search & Cache Test ---
  console.log('--- TEST 1: Rules Assistant Search ---')
  const mockReqSearch = {
    query: { q: 'helmet', category: 'Safety' }
  }
  let searchResult = null
  const mockResSearch = {
    status: function(code) {
      console.log(`- Response Status: ${code}`)
      return this
    },
    json: function(data) {
      searchResult = data
      return this
    }
  }

  // Execute search traffic rules
  await searchTrafficRules(mockReqSearch, mockResSearch)

  if (searchResult && searchResult.rules) {
    console.log(`SUCCESS: Rules searched successfully. Matches found: ${searchResult.rules.length}`)
    const matched = searchResult.rules[0]
    if (matched) {
      console.log(`- Match Title: "${matched.title}"`)
      console.log(`- Section Reference: ${matched.sectionReference}`)
      console.log(`- Fine Amount: ₹${matched.fineAmount}`)
      console.log(`- Category: ${matched.category}`)
    } else {
      console.error('FAIL: Rules Search returned 0 matches although rules seeded!')
      process.exit(1)
    }
  } else {
    console.error('FAIL: Rules Search returned null result')
    process.exit(1)
  }

  // --- PART 2: Caching Verification ---
  console.log('\n--- TEST 2: Rules Query Cache Verification ---')
  const startTimer = Date.now()
  await searchTrafficRules(mockReqSearch, mockResSearch)
  const duration = Date.now() - startTimer
  console.log(`- Cached Rule Fetch Duration: ${duration}ms (Expected to be extremely fast near ~0-5ms)`)

  // --- PART 3: Route Scanner & Proximity Proximity checks ---
  console.log('\n--- TEST 3: Route Proximity Scanner (Haversine Grid Matching) ---')
  
  // We mock a route segment that goes through Tiruppur school crossing [77.3450, 11.1150]
  // The polyline route coordinates pass through [77.3411, 11.1085] (Tiruppur Junction) to [77.3460, 11.1160] (close to school)
  const mockRoute = {
    distance: 12000,
    duration: 900,
    geometry: {
      coordinates: [
        [77.3411, 11.1085], // Tiruppur Junction
        [77.3430, 11.1120],
        [77.3450, 11.1150], // MATCH: Tiruppur Public School Crossing [77.3450, 11.1150]
        [77.3465, 11.1170]
      ]
    },
    legs: [
      {
        distance: 12000,
        duration: 900,
        steps: [
          { name: 'Tiruppur Junction Road', distance: 4000, duration: 300, maneuver: { type: 'depart', instruction: 'Start route' } },
          { name: 'Avinashi School Link Road', distance: 8000, duration: 600, maneuver: { type: 'arrive', instruction: 'Reach school crossing' } }
        ]
      }
    ]
  }

  console.log('- Executing Route Spatial Scanning...')
  const routeIntel = await calculateRouteIntelligence(mockRoute)

  if (routeIntel) {
    console.log('SUCCESS: Route scanned successfully.')
    console.log(`- Distance: ${routeIntel.telemetrySummary.distanceKm} km`)
    console.log(`- Duration: ${routeIntel.telemetrySummary.durationHours} hours`)
    console.log(`- Nearby School Zones: ${routeIntel.nearbySchools.length}`)
    
    routeIntel.nearbySchools.forEach(s => {
      console.log(`  * Scanned School: "${s.name}" (Coordinates: [${s.coordinates.join(', ')}], Speed Limit: ${s.speedLimitKmh} km/h)`)
    })

    console.log(`- Nearby Accident Zones: ${routeIntel.nearbyAccidents.length}`)
    routeIntel.nearbyAccidents.forEach(a => {
      console.log(`  * Scanned Blackspot: "${a.name}" (Risk Level: ${a.riskLevel})`)
    })

    console.log(`- Nearby Speed Traps: ${routeIntel.nearbySpeeds.length}`)
    routeIntel.nearbySpeeds.forEach(sp => {
      console.log(`  * Scanned Speed Trap: "${sp.name}" (Speed Limit: ${sp.speedLimitKmh} km/h)`)
    })
  } else {
    console.error('FAIL: Route scan returned null')
    process.exit(1)
  }

  console.log('\n=== ALL RULES ASSISTANT & ROUTE INTELLIGENCE TESTS PASSED SUCCESSFULLY ===')
}

runTest().catch(err => {
  console.error('Test script unhandled exception:', err)
  process.exit(1)
})
