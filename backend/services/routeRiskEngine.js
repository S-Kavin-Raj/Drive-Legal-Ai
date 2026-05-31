/**
 * Route Risk Scoring Engine
 * Computes non-random, mathematically derived risk scores based on actual 
 * Mapbox Directions API route metadata (distance, duration, geometry, legs, steps, intersections).
 */

/**
 * Calculates a normalized risk score between 0 and 100 based on route characteristics.
 * @param {Object} route The raw route object from Mapbox Directions API routes[0]
 * @returns {Object} { riskScore, riskCategory, riskFactors }
 */
function calculateRiskScore(route) {
  if (!route) {
    return {
      riskScore: 0,
      riskCategory: 'Low',
      riskFactors: []
    }
  }

  const distance = route.distance || 0 // meters
  const duration = route.duration || 0 // seconds
  const distanceKm = distance / 1000
  const durationHrs = duration / 3600

  // Initialize individual factors (Max 100 total sum)
  let fatigueScore = 0 // Max 20
  let highwayScore = 0 // Max 20
  let urbanDensityScore = 0 // Max 20
  let turnsScore = 0 // Max 15
  let complexIntersectionsScore = 0 // Max 15
  let congestionScore = 0 // Max 10

  const riskFactors = []

  // 1. Fatigue Factor (Route Length & Duration) - Max 20 points
  // 5 points per hour of travel, capped at 4 hours (20 points).
  fatigueScore = Math.min(20, Math.round(durationHrs * 5))
  if (fatigueScore > 8) {
    riskFactors.push({
      factor: 'Driver Fatigue Risk',
      impact: fatigueScore,
      description: `Travel time (${durationHrs.toFixed(1)} hrs) increases physical fatigue and exhaustion threshold.`
    })
  }

  const legs = route.legs || []
  const steps = legs.flatMap(leg => leg.steps || [])

  if (steps.length > 0) {
    // 2. Highway Exposure - Max 20 points
    // High-speed roads increase impact severity.
    // Identify highway exposure by class (motorway/trunk) or string patterns in road names.
    let highwayDistance = 0
    steps.forEach(step => {
      const name = (step.name || '').toLowerCase()
      const maneuverInstruction = (step.maneuver?.instruction || '').toLowerCase()
      const isHighway = 
        name.includes('expressway') || 
        name.includes('highway') || 
        name.includes('tollway') || 
        name.includes('bypass') ||
        /\b(nh|sh|ah|exp)\b/.test(name) ||
        maneuverInstruction.includes('motorway') ||
        maneuverInstruction.includes('freeway')

      if (isHighway) {
        highwayDistance += step.distance || 0
      }
    })

    const highwayRatio = distance > 0 ? highwayDistance / distance : 0
    highwayScore = Math.min(20, Math.round(highwayRatio * 20))
    if (highwayScore > 6) {
      riskFactors.push({
        factor: 'Highway Exposure',
        impact: highwayScore,
        description: `${Math.round(highwayRatio * 100)}% of the route occurs on high-speed expressways or state highways.`
      })
    }

    // 3. Urban Density (Steps per Km) - Max 20 points
    // Frequent routing instructions per kilometer indicate dense municipal grids.
    const stepsPerKm = distanceKm > 0 ? steps.length / distanceKm : 0
    // Scaled at 8 points per step/km (2.5 steps/km matches the max 20 points)
    urbanDensityScore = Math.min(20, Math.round(stepsPerKm * 8))
    if (urbanDensityScore > 6) {
      riskFactors.push({
        factor: 'Urban Density',
        impact: urbanDensityScore,
        description: `Frequent routing directions (${steps.length} steps) indicate high-density municipal grids.`
      })
    }

    // 4. Turns and Maneuvers - Max 15 points
    // Turn counts increase blind-spot risk. Filter steps containing turns or modifications.
    let turnCount = 0
    steps.forEach(step => {
      const maneuverType = (step.maneuver?.type || '').toLowerCase()
      const modifier = (step.maneuver?.modifier || '').toLowerCase()
      if (maneuverType.includes('turn') || modifier.includes('left') || modifier.includes('right')) {
        turnCount++
      }
    })

    // 0.75 points per turn, max 15 points (capped at 20 turns)
    turnsScore = Math.min(15, Math.round(turnCount * 0.75))
    if (turnsScore > 4) {
      riskFactors.push({
        factor: 'Maneuver Complexity',
        impact: turnsScore,
        description: `Trip requires ${turnCount} major turns, expanding lane merge and turning exposure.`
      })
    }

    // 5. Complex Intersections - Max 15 points
    // Intersections with >= 4 bearings or lane controls.
    let complexIntersectionsCount = 0
    steps.forEach(step => {
      const intersections = step.intersections || []
      intersections.forEach(inter => {
        const bearings = inter.bearings || []
        const hasLanes = inter.lanes && inter.lanes.length > 0
        if (bearings.length >= 4 || hasLanes) {
          complexIntersectionsCount++
        }
      })
    })

    // 0.5 points per complex intersection, capped at 30 complex nodes (15 points)
    complexIntersectionsScore = Math.min(15, Math.round(complexIntersectionsCount * 0.5))
    if (complexIntersectionsScore > 4) {
      riskFactors.push({
        factor: 'Complex Intersections',
        impact: complexIntersectionsScore,
        description: `Passes through ${complexIntersectionsCount} complex multi-bearing intersections or structured signal nodes.`
      })
    }
  }

  // 6. Congestion Score (Speed Deviation) - Max 10 points
  // Optimal speed average under 35 km/h suggests active congestion delays.
  const averageSpeedKmh = durationHrs > 0 ? distanceKm / durationHrs : 0
  if (averageSpeedKmh > 0 && averageSpeedKmh < 35) {
    congestionScore = Math.min(10, Math.round((35 - averageSpeedKmh) * 0.5))
  }
  if (congestionScore > 3) {
    riskFactors.push({
      factor: 'Congestion Density',
      impact: congestionScore,
      description: `Low average speeds (${Math.round(averageSpeedKmh)} km/h) indicate active congestion zones.`
    })
  }

  // Normalization
  const totalScore = Math.min(100, fatigueScore + highwayScore + urbanDensityScore + turnsScore + complexIntersectionsScore + congestionScore)

  let riskCategory = 'Low'
  if (totalScore > 65) {
    riskCategory = 'High'
  } else if (totalScore >= 35) {
    riskCategory = 'Medium'
  }

  // Sort factors by impact descending
  riskFactors.sort((a, b) => b.impact - a.impact)

  return {
    riskScore: totalScore,
    riskCategory,
    riskFactors
  }
}

module.exports = {
  calculateRiskScore
}
