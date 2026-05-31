const { calculateRouteIntelligence } = require('../services/routeIntelligenceEngine')
const { saveRouteAnalysis } = require('../services/routeAnalysisStore')

async function evaluateRouteIntelligence(req, res) {
  try {
    const { route, userId, source, destination } = req.body || {}

    if (!route) {
      return res.status(400).json({ error: 'route is required and must be a real ORS route response.' })
    }

    const intelligence = calculateRouteIntelligence(route)

    let analysisId = null
    if (userId) {
      analysisId = await saveRouteAnalysis({
        userId,
        source: source || null,
        destination: destination || null,
        routeTelemetry: {
          distance: route.distance || 0,
          duration: route.duration || 0,
          geometry: route.geometry || null,
        },
        routeIntelligence: intelligence,
        explanationLayer: intelligence.explanationLayer,
        telemetrySummary: intelligence.telemetrySummary,
      })
    }

    return res.json({
      ...intelligence,
      analysisId,
    })
  } catch (error) {
    console.error('Route intelligence evaluation error:', error)
    return res.status(500).json({ error: error.message || 'Failed to evaluate route intelligence.' })
  }
}

module.exports = {
  evaluateRouteIntelligence,
}
