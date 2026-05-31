const {
  evaluateComplianceForUser,
  getComplianceHistoryForUser,
} = require('../services/complianceEngine')

async function evaluateCompliance(req, res) {
  try {
    console.log('[backend] /api/compliance/evaluate received. headers:', JSON.stringify(req.headers));
    console.log('[backend] body:', JSON.stringify(req.body));
    const userId = req.user?.userId || req.body?.userId || req.params?.userId

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    const result = await evaluateComplianceForUser(userId)

    // Recalculate Trust Score (Step 12)
    try {
      const { recalculateUserTrustScore } = require('../services/trustScoreEngine')
      await recalculateUserTrustScore(userId)
    } catch (trustErr) {
      console.warn('Failed to recalculate trust score after compliance evaluation:', trustErr.message)
    }

    return res.json(result)
  } catch (error) {
    console.error('Compliance evaluation error:', error)
    return res.status(500).json({ error: error.message || 'Failed to evaluate compliance.' })
  }
}

async function getComplianceHistory(req, res) {
  try {
    const userId = req.user?.userId || req.body?.userId || req.params?.userId
    const limit = Number(req.query.limit || 10)

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    const history = await getComplianceHistoryForUser(userId, limit)
    return res.json({ history })
  } catch (error) {
    console.error('Compliance history error:', error)
    // If Firestore requires an index (COMMON in dev), return empty array instead of 500
    const msg = error && (error.message || (error.details && error.details)) || ''
    if ((error && error.code === 9) || msg.includes('requires an index') || msg.includes('FAILED_PRECONDITION')) {
      console.warn('[complianceController] Firestore index required - returning empty history for UX stability.')
      return res.json({ history: [] })
    }
    return res.status(500).json({ error: error.message || 'Failed to fetch compliance history.' })
  }
}

module.exports = {
  evaluateCompliance,
  getComplianceHistory,
}
