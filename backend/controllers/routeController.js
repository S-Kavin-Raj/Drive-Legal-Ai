const { calculateRiskScore } = require('../services/routeRiskEngine')
const { generateRecommendations } = require('../services/recommendationEngine')
const { calculateRouteIntelligence } = require('../services/routeIntelligenceEngine')
const { saveRouteAnalysis } = require('../services/routeAnalysisStore')

// Validation Middleware for coordinates
function validateRouteRequest(req, res, next) {
  const { source, destination } = req.body
  const userId = req.user?.userId || req.body?.userId

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' })
  }

  if (!source || !destination) {
    return res.status(400).json({ error: 'Source and destination parameters are required.' })
  }

  if (!source.name || !source.coordinates || !Array.isArray(source.coordinates) || source.coordinates.length !== 2) {
    return res.status(400).json({ error: 'Source must contain a valid name and coordinate array [longitude, latitude].' })
  }

  if (!destination.name || !destination.coordinates || !Array.isArray(destination.coordinates) || destination.coordinates.length !== 2) {
    return res.status(400).json({ error: 'Destination must contain a valid name and coordinate array [longitude, latitude].' })
  }

  const [srcLng, srcLat] = source.coordinates
  const [destLng, destLat] = destination.coordinates

  if (typeof srcLng !== 'number' || typeof srcLat !== 'number' || typeof destLng !== 'number' || typeof destLat !== 'number') {
    return res.status(400).json({ error: 'Coordinates must be valid numerical values.' })
  }

  next()
}

function mapOrsToMapboxRoute(orsFeature) {
  if (!orsFeature) {
    throw new Error('Invalid OpenRouteService route feature.')
  }

  const segment = orsFeature.properties?.segments?.[0]
  const summary = orsFeature.properties?.summary

  // Map steps
  const mappedSteps = (segment?.steps || []).map((step, idx) => {
    const instruction = step.instruction || ''
    
    // Determine maneuver type and modifier from instruction
    let maneuverType = 'turn'
    let modifier = 'straight'
    
    const lowerInstr = instruction.toLowerCase()
    if (idx === 0) {
      maneuverType = 'depart'
    } else if (idx === (segment.steps.length - 1)) {
      maneuverType = 'arrive'
    } else if (lowerInstr.includes('left')) {
      maneuverType = 'turn'
      modifier = 'left'
    } else if (lowerInstr.includes('right')) {
      maneuverType = 'turn'
      modifier = 'right'
    } else if (lowerInstr.includes('merge')) {
      maneuverType = 'merge'
    } else if (lowerInstr.includes('roundabout')) {
      maneuverType = 'roundabout'
    } else if (lowerInstr.includes('keep')) {
      maneuverType = 'fork'
    }

    // Synthesize intersections for risk engine math
    const isComplex = maneuverType === 'roundabout' || maneuverType === 'merge' || (maneuverType === 'turn' && modifier !== 'straight')
    const simulatedIntersections = [
      {
        bearings: isComplex ? [0, 90, 180, 270] : [0, 180],
        entry: isComplex ? [true, true, false, false] : [true, false],
        lanes: isComplex ? [{ valid: true }] : []
      }
    ]

    return {
      name: step.name || 'Street',
      distance: step.distance || 0,
      duration: step.duration || 0,
      maneuver: {
        type: maneuverType,
        modifier: modifier,
        instruction: instruction
      },
      intersections: simulatedIntersections
    }
  })

  return {
    distance: summary?.distance || segment?.distance || 0,
    duration: summary?.duration || segment?.duration || 0,
    geometry: orsFeature.geometry, // LineString coordinates are already [lon, lat]
    legs: [
      {
        distance: summary?.distance || segment?.distance || 0,
        duration: summary?.duration || segment?.duration || 0,
        summary: segment?.name || 'Driving Route',
        steps: mappedSteps
      }
    ]
  }
}

// Controller logic to analyze journey routes
async function handleRouteAnalysis(req, res) {
  const { source, destination, complianceScore, documentStatus } = req.body
  const userId = req.user?.userId || req.body?.userId

  // Log incoming request for debugging
  try {
    console.log('[routeController] /api/route-risk request received. userId:', userId)
    console.log('[routeController] payload:', JSON.stringify(req.body))
  } catch (e) {
    console.warn('[routeController] Failed to stringify request body for logging', e)
  }

  try {
    const [srcLng, srcLat] = source.coordinates
    const [destLng, destLat] = destination.coordinates

    const ORS_API_KEY = process.env.ORS_API_KEY
    if (!ORS_API_KEY) {
      return res.status(500).json({ error: 'OpenRouteService API key is missing on the server.' })
    }

    // Query OpenRouteService Directions API with driving-car profile
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${encodeURIComponent(ORS_API_KEY)}&start=${srcLng},${srcLat}&end=${destLng},${destLat}`

    let data = null
    try {
      console.log('[routeController] Calling OpenRouteService URL:', url)
      const response = await fetch(url)
      const text = await response.text()
        // Log raw ORS response (preview) for debugging telemetry extraction
        try { console.log('[routeController] OpenRouteService raw response preview:', text.slice(0, 2000)) } catch(e) {}
      try {
        data = JSON.parse(text)
      } catch (e) {
        data = null
      }
      if (!response.ok) {
        const orsMessage = (() => {
          try {
            const parsed = JSON.parse(text)
            return parsed?.error?.message || parsed?.error || parsed?.message || response.statusText || 'OpenRouteService API error'
          } catch {
            return response.statusText || 'OpenRouteService API error'
          }
        })()
        console.error('[routeController] OpenRouteService responded with non-OK status', {
          status: response.status,
          statusText: response.statusText,
          errorMessage: orsMessage,
          body: text,
        })
        return res.status(502).json({
          error: `ORS Error ${response.status}: ${orsMessage} — Response body: ${text}`,
          status: response.status,
          orsError: orsMessage,
          body: text,
        })
      }
    } catch (fetchErr) {
      console.error('[routeController] Error while calling OpenRouteService:', fetchErr && (fetchErr.stack || fetchErr.message), {
        status: fetchErr?.response?.status,
        body: fetchErr?.response?.data,
      })
      return res.status(502).json({
        error: `ORS Error ${fetchErr?.response?.status || 'unknown'}: ${fetchErr && fetchErr.message ? fetchErr.message : 'Failed to contact OpenRouteService'} — Response body: ${typeof fetchErr?.response?.data === 'string' ? fetchErr.response.data : JSON.stringify(fetchErr?.response?.data || null)}`,
        status: fetchErr?.response?.status || null,
        body: fetchErr?.response?.data || null,
      })
    }
    const orsFeature = data.features?.[0]
    if (!orsFeature) {
      throw new Error('No driving route options found in the OpenRouteService API response.')
    }

    // Map to Mapbox format for downstream engines and front-end expectations
    let route = null
    try {
      route = mapOrsToMapboxRoute(orsFeature)
    } catch (mapErr) {
      console.error('[routeController] Error mapping ORS feature to route format:', mapErr && (mapErr.stack || mapErr.message))
      return res.status(500).json({ error: 'Failed to map ORS route to internal format', details: mapErr && mapErr.message })
    }

    // Call Route Risk Scoring Engine
    const riskAnalysis = calculateRiskScore(route)

    // Call Route Intelligence Engine
    const routeIntel = await calculateRouteIntelligence(route)

    // Call Recommendation Engine
    const recommendations = generateRecommendations({
      route,
      routeIntel,
      riskScore: riskAnalysis.riskScore,
      complianceScore,
      documentStatus
    })

    const analysisPayload = {
      userId: userId || null,
      source: source.name,
      destination: destination.name,
      sourceCoordinates: source.coordinates,
      destinationCoordinates: destination.coordinates,
      routeTelemetry: {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
      },
      riskScore: riskAnalysis.riskScore,
      riskCategory: riskAnalysis.riskCategory,
      riskFactors: riskAnalysis.riskFactors,
      routeIntelligence: routeIntel,
      recommendations,
      complianceScore: complianceScore ?? null,
      documentStatus: documentStatus ?? null,
      telemetrySummary: routeIntel.telemetrySummary,
      explanationLayer: routeIntel.explanationLayer,
    }

    let analysisId = null
    if (userId) {
      try {
        console.log('[routeController] analysisPayload (pre-save) keys:', Object.keys(analysisPayload))
        // Log a small sanitized preview
        try { console.log('[routeController] analysisPayload preview:', JSON.stringify(analysisPayload, null, 2).slice(0, 2000)) } catch(e) {}
        analysisId = await saveRouteAnalysis(analysisPayload)
      } catch (saveErr) {
        console.error('[routeController] Failed to persist analysis:', saveErr && (saveErr.stack || saveErr.message))
        // continue: we still want to return analysis to the client even if persistence fails
        analysisId = null
      }
    }

    res.json({
      analysisId,
      distanceKm: Number((route.distance / 1000).toFixed(1)),
      durationMinutes: Math.round(route.duration / 60),
      geometry: route.geometry,
      riskScore: riskAnalysis.riskScore,
      riskCategory: riskAnalysis.riskCategory,
      riskFactors: riskAnalysis.riskFactors,
      recommendations,
      routeIntelligence: routeIntel,
      highwayExposure: routeIntel.highwayExposure,
      intersectionComplexity: routeIntel.intersectionComplexity,
      fatigueLevel: routeIntel.fatigueLevel,
      urbanDensity: routeIntel.urbanDensity,
      maneuverCounts: routeIntel.maneuverCounts,
      explanationLayer: routeIntel.explanationLayer,
      telemetrySummary: routeIntel.telemetrySummary,
    })
  } catch (err) {
     console.error('Route Risk Analysis Controller error:', err && (err.stack || err.message))
     // return structured error for easier frontend handling
     const statusCode = err && err.statusCode ? err.statusCode : 500
     res.status(statusCode).json({ error: err.message || 'Internal server error while evaluating route risk.' , stack: err.stack || null })
  }
}

module.exports = {
  validateRouteRequest,
  handleRouteAnalysis
}
