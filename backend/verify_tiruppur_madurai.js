const path = require('path')
require('dotenv').config()

const ORS_API_KEY = process.env.ORS_API_KEY

async function runVerification() {
  console.log('=== STARTING E2E VERIFICATION SPRINT: TIRUPPUR -> MADURAI ===')
  console.log(`API Key loaded: ${ORS_API_KEY ? 'Yes (starts with ' + ORS_API_KEY.substring(0, 10) + '...)' : 'No'}`)

  if (!ORS_API_KEY) {
    console.error('ERROR: ORS_API_KEY is missing.')
    process.exit(1)
  }

  // 1. Geocoding
  console.log('\n[1/3] Geocoding Tiruppur & Madurai via OpenRouteService...')
  const tiruppurUrl = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(ORS_API_KEY)}&text=Tiruppur&size=1&boundary.country=IN`
  const maduraiUrl = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(ORS_API_KEY)}&text=Madurai&size=1&boundary.country=IN`

  const [tiruppurRes, maduraiRes] = await Promise.all([
    fetch(tiruppurUrl).then(res => res.json()),
    fetch(maduraiUrl).then(res => res.json())
  ])

  const tiruppurFeature = tiruppurRes.features?.[0]
  const maduraiFeature = maduraiRes.features?.[0]

  if (!tiruppurFeature || !maduraiFeature) {
    console.error('ERROR: Failed to geocode source or destination.')
    process.exit(1)
  }

  const tiruppurCoords = tiruppurFeature.geometry.coordinates // [lng, lat]
  const maduraiCoords = maduraiFeature.geometry.coordinates // [lng, lat]

  console.log(`- Tiruppur: "${tiruppurFeature.properties.label}" -> coordinates [Lng, Lat]: [${tiruppurCoords.join(', ')}]`)
  console.log(`- Madurai: "${maduraiFeature.properties.label}" -> coordinates [Lng, Lat]: [${maduraiCoords.join(', ')}]`)

  // 2. Post to backend endpoint
  console.log('\n[2/3] Querying backend /api/route-risk (Tiruppur -> Madurai)...')
  const payload = {
    source: {
      name: tiruppurFeature.properties.label,
      coordinates: tiruppurCoords
    },
    destination: {
      name: maduraiFeature.properties.label,
      coordinates: maduraiCoords
    },
    userId: 'test-e2e-user-456',
    complianceScore: 100,
    documentStatus: {
      rc: 'Valid',
      insurance: 'Valid',
      dl: 'Valid',
      puc: 'Valid'
    }
  }

  const { signSessionToken } = require('./services/jwtService')
  const { token } = signSessionToken({ userId: 'test-e2e-user-456', email: 'test@drivelegal.ai', role: 'user' })

  console.log(`Request Payload sent to /api/route-risk:`, JSON.stringify(payload, null, 2))

  const riskRes = await fetch('http://localhost:4000/api/route-risk', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })

  if (!riskRes.ok) {
    const errText = await riskRes.text()
    console.error(`ERROR: Backend /api/route-risk request failed with status ${riskRes.status}:`, errText)
    process.exit(1)
  }

  const data = await riskRes.json()
  console.log('\nResponse Payload received from /api/route-risk:')
  console.log(`- analysisId: ${data.analysisId}`)
  console.log(`- distanceKm: ${data.distanceKm}`)
  console.log(`- durationMinutes: ${data.durationMinutes}`)
  console.log(`- riskScore: ${data.riskScore}`)
  console.log(`- riskCategory: ${data.riskCategory}`)
  console.log(`- geometry presence: ${data.geometry ? 'Exists' : 'Missing'}`)
  console.log(`- geometry coordinates count: ${data.geometry?.coordinates?.length || 0} vertices`)

  // 3. Coordinate Conversion Check (Simulating Leaflet conversion)
  console.log('\n[3/3] Simulating Coordinates Conversion [Lng, Lat] -> [Lat, Lng] for Leaflet components:')
  const srcLatLng = [tiruppurCoords[1], tiruppurCoords[0]]
  const destLatLng = [maduraiCoords[1], maduraiCoords[0]]
  console.log(`- Converted Start marker position: [${srcLatLng.join(', ')}]`)
  console.log(`- Converted Destination marker position: [${destLatLng.join(', ')}]`)

  if (data.geometry && data.geometry.coordinates) {
    const polylineCoords = data.geometry.coordinates.map(coord => [coord[1], coord[0]])
    console.log(`- First 3 route polyline points:`, JSON.stringify(polylineCoords.slice(0, 3)))
    console.log(`- Last 3 route polyline points:`, JSON.stringify(polylineCoords.slice(-3)))
    console.log(`- Polyline has ${polylineCoords.length} positions to render on Leaflet Map.`)
  } else {
    console.error('ERROR: No geometry telemetry found to verify.')
    process.exit(1)
  }

  console.log('\n=== E2E TIRUPPUR -> MADURAI VERIFICATION SPRINT SUCCESSFUL! ===')
}

runVerification().catch(err => {
  console.error('Unhandled verification error:', err)
  process.exit(1)
})
