/**
 * Recommendation Engine Service
 * Dynamically generates safety and legal compliance travel directives 
 * from actual route characteristics and user compliance metadata.
 */

/**
 * Generates an array of custom, dynamic travel recommendations.
 * @param {Object} params Input parameters for recommendation rules
 * @param {Object} params.route The raw Mapbox route object
 * @param {Object} params.routeIntel The computed route intelligence from routeIntelligenceEngine
 * @param {number} params.riskScore The computed risk score from routeRiskEngine
 * @param {number} params.complianceScore The user's compliance readiness index (0-100)
 * @param {Object} params.documentStatus Status ledger of user legal credentials
 * @returns {Array} List of generated recommendation objects
 */
function generateRecommendations({ route, routeIntel, riskScore, complianceScore, documentStatus }) {
  const recommendations = []

  if (!route) {
    return [
      {
        id: 'rec_default_welcome',
        category: 'General',
        priority: 'low',
        title: 'Plan a Safe Journey',
        reason: 'No active route analysis selected.',
        description: 'Provide a starting point and destination to trace coordinates and generate dynamic legal safety notifications.'
      }
    ]
  }

  // Ensure routeIntel is present or default it
  const intel = routeIntel || {
    highwayExposure: 0,
    intersectionComplexity: 0,
    urbanDensity: 'Low',
    fatigueLevel: 'Low',
    maneuverCounts: { forks: 0, merges: 0, roundabouts: 0, majorTurns: 0 }
  }

  const distanceKm = route.distance ? route.distance / 1000 : 0
  const durationHours = route.duration ? route.duration / 3600 : 0

  // 1. Fatigue Mitigation (Fatigue Level = High OR duration > 5 hours)
  if (intel.fatigueLevel === 'High' || durationHours > 5) {
    recommendations.push({
      id: 'rec_fatigue_limit',
      category: 'Safety',
      priority: 'high',
      title: 'Plan Rest Break',
      reason: `Route fatigue index is High (${durationHours.toFixed(1)} hours of continuous travel detected)`,
      description: `Your journey duration of ${durationHours.toFixed(1)} hours triggers a high fatigue rating. We recommend planning a 15-minute rest break every 2 hours at designated rest stops to prevent driving exhaustion.`
    })
  }

  // 2. Highway Exposure (highwayExposure > 70%)
  if (intel.highwayExposure > 70) {
    recommendations.push({
      id: 'rec_highway_discipline',
      category: 'Safety',
      priority: 'medium',
      title: 'Highway Safety Guidance',
      reason: `Highway exposure is ${intel.highwayExposure}% (exceeds 70% threshold)`,
      description: `A significant portion of your journey (${intel.highwayExposure}%) involves high-speed corridor segments. Maintain constant cruise speed, avoid abrupt lane switching, and keep defensive spacing.`
    })
  }

  // 3. Urban Density (Urban Density = High)
  if (intel.urbanDensity === 'High') {
    recommendations.push({
      id: 'rec_urban_congestion',
      category: 'Safety',
      priority: 'medium',
      title: 'Urban Congestion Awareness',
      reason: `Urban density index is High (complex intersections and frequent maneuvers detected)`,
      description: `This route crosses high-density urban zones. Anticipate sudden stops, complex merges, and localized traffic slow-downs. Stay alert to surrounding vehicles.`
    })
  }

  // 4. Intersection Complexity (Intersection Complexity > 15)
  if (intel.intersectionComplexity > 15) {
    recommendations.push({
      id: 'rec_navigation_attention',
      category: 'Safety',
      priority: 'medium',
      title: 'Increased Navigation Attention',
      reason: `Route contains ${intel.intersectionComplexity} complex intersections (above threshold of 15)`,
      description: `You will cross ${intel.intersectionComplexity} navigation intersection nodes (turns, roundabouts, merges, or forks). Keep your navigation map prominent and signal intentions early.`
    })
  }

  // 5. High Risk Score Warning (Score > 75)
  if (riskScore > 75) {
    recommendations.push({
      id: 'rec_defensive_mode',
      category: 'Safety',
      priority: 'high',
      title: 'Adopt Defensive Driving Mode',
      reason: `Route risk score is ${riskScore}% (exceeds critical threshold of 75%)`,
      description: `The safety risk profile for this journey is elevated at ${riskScore}%. Restrict peak velocities to 80 km/h, minimize overtaking, and drive with extreme defensive caution.`
    })
  }

  // 6. Low Compliance Index (Score < 70)
  const compScoreVal = Number(complianceScore)
  if (!isNaN(compScoreVal) && compScoreVal < 70) {
    recommendations.push({
      id: 'rec_compliance_check',
      category: 'Legal Compliance',
      priority: 'high',
      title: 'Verify Vault Credentials',
      reason: `Compliance readiness index is ${compScoreVal}% (below 70% threshold)`,
      description: `Your vehicle compliance score is lower than the safety baseline. Review your digital vault to resolve expired credentials and settle active citations to prevent impoundment.`
    })
  }

  // 7. Individual Expired/Missing Credentials
  if (documentStatus && typeof documentStatus === 'object') {
    Object.entries(documentStatus).forEach(([docKey, status]) => {
      const docName = docKey.toUpperCase()
      if (status === 'Expired') {
        recommendations.push({
          id: `rec_doc_expired_${docKey}`,
          category: 'Legal Compliance',
          priority: 'high',
          title: `Renew Expired ${docName}`,
          reason: `${docName} is marked as EXPIRED`,
          description: `Your legal locker registers an EXPIRED status for ${docName}. Initiate renewal processing immediately to satisfy local highway authority regulations.`
        })
      }
    })
  }

  // Fallback defaults
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec_safe_journey_default',
      category: 'Safety',
      priority: 'low',
      title: 'Optimal Conditions Logged',
      reason: 'No active hazards or compliance breaches flagged.',
      description: 'Your planned route indicates standard highway exposure, normal duration, and 100% legal document validation. Have a safe journey.'
    })
  }

  return recommendations
}

module.exports = {
  generateRecommendations
}

