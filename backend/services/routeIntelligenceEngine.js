const { db } = require('./firebaseAdmin')

const HIGHWAY_PATTERNS = [
  /\bhighway\b/i,
  /\bexpressway\b/i,
  /\bfreeway\b/i,
  /\bbypass\b/i,
  /\btollway\b/i,
  /\bmotorway\b/i,
  /\bnh\s?-?\d+/i,
  /\bsh\s?-?\d+/i,
  /\bah\s?-?\d+/i,
]

// Geo-spatial zone cache
let schoolZonesCache = null
let hospitalZonesCache = null
let accidentZonesCache = null
let speedZonesCache = null
let lastZonesCacheTime = 0
const ZONES_CACHE_TTL = 10 * 60 * 1000 // 10 minutes cache

async function getCachedZones() {
  const now = Date.now()
  if (schoolZonesCache && (now - lastZonesCacheTime < ZONES_CACHE_TTL)) {
    return {
      schools: schoolZonesCache,
      hospitals: hospitalZonesCache,
      accidents: accidentZonesCache,
      speeds: speedZonesCache
    }
  }

  try {
    const [schoolsSnap, hospitalsSnap, accidentsSnap, speedsSnap] = await Promise.all([
      db.collection('schoolZones').get(),
      db.collection('hospitalZones').get(),
      db.collection('accidentZones').get(),
      db.collection('speedZones').get()
    ])

    schoolZonesCache = schoolsSnap.docs.map(d => d.data())
    hospitalZonesCache = hospitalsSnap.docs.map(d => d.data())
    accidentZonesCache = accidentsSnap.docs.map(d => d.data())
    speedZonesCache = speedsSnap.docs.map(d => d.data())
    lastZonesCacheTime = now
  } catch (err) {
    console.warn('[routeIntelligenceEngine] Failed to load zones from DB, falling back to empty caches:', err.message)
    schoolZonesCache = schoolZonesCache || []
    hospitalZonesCache = hospitalZonesCache || []
    accidentZonesCache = accidentZonesCache || []
    speedZonesCache = speedZonesCache || []
  }

  return {
    schools: schoolZonesCache,
    hospitals: hospitalZonesCache,
    accidents: accidentZonesCache,
    speeds: speedZonesCache
  }
}

// Haversine distance calculator
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// polyline proximity check
function isNearRoute(zoneCoords, routeCoords, maxDistanceKm = 0.5) {
  if (!zoneCoords || !routeCoords || routeCoords.length === 0) return false
  const [zoneLng, zoneLat] = zoneCoords
  
  // Sample route coordinates for high performance
  const step = routeCoords.length > 150 ? 4 : routeCoords.length > 50 ? 2 : 1
  for (let i = 0; i < routeCoords.length; i += step) {
    const [routeLng, routeLat] = routeCoords[i]
    const dist = getDistanceKm(zoneLat, zoneLng, routeLat, routeLng)
    if (dist <= maxDistanceKm) {
      return true
    }
  }
  return false
}

function flattenSteps(route) {
  return (route?.legs || []).flatMap((leg) => leg.steps || [])
}

function getRouteDistanceKm(route) {
  return Number((Number(route?.distance || 0) / 1000).toFixed(2))
}

function getRouteDurationHours(route) {
  return Number((Number(route?.duration || 0) / 3600).toFixed(2))
}

function isHighwayStep(step) {
  const name = String(step?.name || '')
  const instruction = String(step?.maneuver?.instruction || '')
  const destinations = String(step?.destinations || '')
  const exit = String(step?.exit || '')

  return HIGHWAY_PATTERNS.some((pattern) => pattern.test(name) || pattern.test(instruction) || pattern.test(destinations) || pattern.test(exit))
}

function countIntersections(steps) {
  const counts = {
    forks: 0,
    merges: 0,
    roundabouts: 0,
    majorTurns: 0,
  }

  steps.forEach((step) => {
    const maneuverType = String(step?.maneuver?.type || '').toLowerCase()
    const modifier = String(step?.maneuver?.modifier || '').toLowerCase()
    const instruction = String(step?.maneuver?.instruction || '').toLowerCase()

    if (maneuverType.includes('roundabout') || maneuverType.includes('rotary') || instruction.includes('roundabout')) {
      counts.roundabouts += 1
      return
    }

    if (maneuverType.includes('fork') || instruction.includes('fork')) {
      counts.forks += 1
      return
    }

    if (maneuverType.includes('merge') || instruction.includes('merge')) {
      counts.merges += 1
      return
    }

    if (maneuverType.includes('turn') || modifier.includes('left') || modifier.includes('right')) {
      counts.majorTurns += 1
    }
  })

  return counts
}

function buildExplanationLayer({ highwayExposure, intersections, urbanDensity, fatigueLevel, maneuverCount, distanceKm, durationHours }) {
  const explanations = []

  if (highwayExposure >= 60) {
    explanations.push(`Highway exposure is ${highwayExposure}% based on actual step distances on highway-named segments.`)
  } else if (highwayExposure >= 30) {
    explanations.push(`Moderate highway usage detected at ${highwayExposure}% of total route distance.`)
  } else {
    explanations.push(`Low highway exposure detected (${highwayExposure}%) from real route telemetry.`)
  }

  const intersectionTotal = intersections.forks + intersections.merges + intersections.roundabouts + intersections.majorTurns
  if (intersectionTotal >= 12) {
    explanations.push(`High maneuver density detected: ${intersections.forks} forks, ${intersections.merges} merges, ${intersections.roundabouts} roundabouts, and ${intersections.majorTurns} major turns.`)
  } else if (intersectionTotal >= 6) {
    explanations.push(`Moderate maneuver complexity detected across ${intersectionTotal} route maneuvers.`)
  } else {
    explanations.push(`Low maneuver complexity detected across ${intersectionTotal} route maneuvers.`)
  }

  explanations.push(`Urban density is ${urbanDensity} using maneuver frequency (${maneuverCount} maneuvers over ${distanceKm} km).`)
  explanations.push(`Fatigue level is ${fatigueLevel} based on ${distanceKm} km traveled over ${durationHours} hours.`)

  return explanations
}

async function calculateRouteIntelligence(route) {
  const distance = Number(route?.distance || 0)
  const duration = Number(route?.duration || 0)
  const distanceKm = getRouteDistanceKm(route)
  const durationHours = getRouteDurationHours(route)
  const steps = flattenSteps(route)
  const routeCoords = route?.geometry?.coordinates || []

  const baseResult = {
    highwayExposure: 0,
    intersectionComplexity: 0,
    urbanDensity: 'Low',
    fatigueLevel: 'Low',
    maneuverCounts: {
      forks: 0,
      merges: 0,
      roundabouts: 0,
      majorTurns: 0,
    },
    nearbySchools: [],
    nearbyHospitals: [],
    nearbyAccidents: [],
    nearbySpeeds: [],
    explanationLayer: ['Insufficient route telemetry to derive route intelligence.'],
    telemetrySummary: {
      distanceKm,
      durationHours,
      stepCount: steps.length,
    },
  }

  if (!distance || !duration || steps.length === 0) {
    return baseResult
  }

  const highwayDistance = steps.reduce((total, step) => (isHighwayStep(step) ? total + Number(step?.distance || 0) : total), 0)
  const highwayExposure = Math.max(0, Math.min(100, Math.round((highwayDistance / distance) * 100)))

  const maneuverCounts = countIntersections(steps)
  const intersectionComplexity = maneuverCounts.forks + maneuverCounts.merges + maneuverCounts.roundabouts + maneuverCounts.majorTurns

  const maneuversPerKm = distanceKm > 0 ? steps.length / distanceKm : 0
  const turnsPerKm = distanceKm > 0 ? maneuverCounts.majorTurns / distanceKm : 0
  const maneuverDensity = maneuversPerKm + turnsPerKm

  let urbanDensity = 'Low'
  if (maneuverDensity >= 2.2 || intersectionComplexity >= 12) {
    urbanDensity = 'High'
  } else if (maneuverDensity >= 1 || intersectionComplexity >= 5) {
    urbanDensity = 'Medium'
  }

  const avgSpeedKmh = durationHours > 0 ? distanceKm / durationHours : 0
  let fatigueLevel = 'Low'
  if (durationHours >= 5 || distanceKm >= 350 || avgSpeedKmh < 35) {
    fatigueLevel = 'High'
  } else if (durationHours >= 2 || distanceKm >= 120) {
    fatigueLevel = 'Moderate'
  }

  // Scan route zones
  const { schools, hospitals, accidents, speeds } = await getCachedZones()
  const nearbySchools = schools.filter(s => isNearRoute(s.coordinates, routeCoords, 0.5))
  const nearbyHospitals = hospitals.filter(h => isNearRoute(h.coordinates, routeCoords, 0.5))
  const nearbyAccidents = accidents.filter(a => isNearRoute(a.coordinates, routeCoords, 0.5))
  const nearbySpeeds = speeds.filter(s => isNearRoute(s.coordinates, routeCoords, 0.5))

  return {
    highwayExposure,
    intersectionComplexity,
    urbanDensity,
    fatigueLevel,
    maneuverCounts,
    nearbySchools,
    nearbyHospitals,
    nearbyAccidents,
    nearbySpeeds,
    explanationLayer: buildExplanationLayer({
      highwayExposure,
      intersections: maneuverCounts,
      urbanDensity,
      fatigueLevel,
      maneuverCount: steps.length,
      distanceKm,
      durationHours,
    }),
    telemetrySummary: {
      distanceKm,
      durationHours,
      stepCount: steps.length,
      maneuversPerKm: Number(maneuversPerKm.toFixed(2)),
      turnsPerKm: Number(turnsPerKm.toFixed(2)),
      avgSpeedKmh: Number(avgSpeedKmh.toFixed(2)),
    },
  }
}

module.exports = {
  calculateRouteIntelligence,
  flattenSteps,
}
