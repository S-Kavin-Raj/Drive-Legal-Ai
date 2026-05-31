/**
 * trafficRuleEngine.js
 * 
 * Pure logic module for real-time traffic rule evaluation.
 * No Firestore reads — all zone data is passed as arguments.
 * No mock data. No simulation. Production-only.
 */

// ─── Haversine distance in km ────────────────────────────────────────────────
export function getDistanceKm(lat1, lon1, lat2, lon2) {
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

// ─── Speed Limit Evaluation (Feature 1) ─────────────────────────────────────
/**
 * Evaluates current speed against a given speed limit.
 * 
 * @param {number} currentSpeed   - Current GPS speed in km/h
 * @param {number} speedLimitKmh  - Zone speed limit in km/h
 * @returns {{ speedLimit: number, violation: boolean, warningLevel: string|null }}
 */
export function evaluateSpeedLimit(currentSpeed, speedLimitKmh) {
  if (!speedLimitKmh || speedLimitKmh <= 0) {
    return { speedLimit: speedLimitKmh || 0, violation: false, warningLevel: null }
  }

  const over = currentSpeed - speedLimitKmh

  if (over <= 0) {
    return { speedLimit: speedLimitKmh, violation: false, warningLevel: null }
  }

  return {
    speedLimit: speedLimitKmh,
    violation: over > 10,
    warningLevel: classifyWarningLevel(over),
  }
}

// ─── Warning Level Classification ────────────────────────────────────────────
/**
 * Converts km/h overspeed into a severity label.
 *
 * @param {number} over - km/h over the speed limit (must be > 0)
 * @returns {string}
 */
export function classifyWarningLevel(over) {
  if (over >= 20) return 'Violation'
  if (over >= 11) return 'High Risk'
  return 'Warning'
}

// ─── Zone Proximity Check (Features 2–4) ─────────────────────────────────────
/**
 * Returns all zones within a given radius of the current coordinate.
 * Radius from zone.radius (meters) is used when available; fallback to radiusFallbackKm.
 *
 * @param {[number, number]} coord          - [latitude, longitude]
 * @param {Array<object>}    zones          - Array of zone objects
 * @param {number}           radiusFallbackKm - Default radius in km when zone.radius is missing
 * @returns {Array<object>}
 */
export function checkZoneProximity(coord, zones, radiusFallbackKm = 0.15) {
  if (!coord || !zones || zones.length === 0) return []

  const [lat, lng] = coord
  const matches = []

  for (const zone of zones) {
    // Support both flat lat/lng fields and coordinates array format
    const zoneLat = zone.latitude ?? zone.coordinates?.[1]
    const zoneLng = zone.longitude ?? zone.coordinates?.[0]

    if (zoneLat == null || zoneLng == null) continue

    const dist = getDistanceKm(lat, lng, zoneLat, zoneLng)
    // Convert zone.radius from metres to km; fall back to radiusFallbackKm
    const thresholdKm = zone.radius ? zone.radius / 1000 : radiusFallbackKm

    if (dist <= thresholdKm) {
      matches.push({
        ...zone,
        _distKm: dist,
        _distMeters: Math.round(dist * 1000),
      })
    }
  }

  // Sort closest first
  matches.sort((a, b) => a._distKm - b._distKm)
  return matches
}

// ─── Off-Route Detection (Feature 5) ─────────────────────────────────────────
/**
 * Determines if the current position has deviated > 200m from the planned polyline.
 *
 * @param {[number, number]}   coord          - [latitude, longitude]
 * @param {Array<[number,number]>} polyline   - Route polyline in [lat, lng] pairs
 * @returns {{ offRoute: boolean, deviationMeters: number, closestIndex: number }}
 */
export function detectOffRoute(coord, polyline) {
  if (!coord || !polyline || polyline.length === 0) {
    return { offRoute: false, deviationMeters: 0, closestIndex: 0 }
  }

  let minDist = Infinity
  let closestIndex = 0

  for (let i = 0; i < polyline.length; i++) {
    const d = getDistanceKm(coord[0], coord[1], polyline[i][0], polyline[i][1])
    if (d < minDist) {
      minDist = d
      closestIndex = i
    }
  }

  return {
    offRoute: minDist > 0.2,
    deviationMeters: Math.round(minDist * 1000),
    closestIndex,
  }
}

// ─── Route Progress Calculation ───────────────────────────────────────────────
/**
 * Calculates remaining distance along the polyline from closestIndex.
 *
 * @param {Array<[number,number]>} polyline
 * @param {number}                 closestIndex
 * @returns {number} remaining distance in km
 */
export function calcRemainingDistance(polyline, closestIndex) {
  let remaining = 0
  for (let i = closestIndex; i < polyline.length - 1; i++) {
    remaining += getDistanceKm(
      polyline[i][0], polyline[i][1],
      polyline[i + 1][0], polyline[i + 1][1]
    )
  }
  return Number(remaining.toFixed(2))
}

// ─── Safety Score Formula (Feature 7) ────────────────────────────────────────
/**
 * Derives a 0–100 safety score from session counters.
 *
 * @param {number} warningsCount
 * @param {number} violationsCount
 * @returns {number}
 */
export function calcSafetyScore(warningsCount, violationsCount) {
  const raw = 100 - violationsCount * 10 - warningsCount * 3
  return Math.max(0, Math.min(100, Math.round(raw)))
}

// ─── Event type constants ─────────────────────────────────────────────────────
export const EVENT_TYPES = {
  SPEED_WARNING: 'SPEED_WARNING',
  SCHOOL_ZONE:   'SCHOOL_ZONE',
  HOSPITAL_ZONE: 'HOSPITAL_ZONE',
  ACCIDENT_ZONE: 'ACCIDENT_ZONE',
  OFF_ROUTE:     'OFF_ROUTE',
}
