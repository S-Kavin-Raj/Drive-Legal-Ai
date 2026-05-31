const { getTrustScoreData, recalculateUserTrustScore } = require('../services/trustScoreEngine')

async function getTrustScore(req, res) {
  try {
    const userId = req.user?.userId || req.body?.userId || req.query?.userId
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    const scoreData = await getTrustScoreData(userId)
    return res.json(scoreData)
  } catch (error) {
    console.error('[getTrustScore] Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch trust score.' })
  }
}

async function recalculateTrustScore(req, res) {
  try {
    const userId = req.user?.userId || req.body?.userId
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    const scoreData = await recalculateUserTrustScore(userId)
    return res.json(scoreData)
  } catch (error) {
    console.error('[recalculateTrustScore] Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to recalculate trust score.' })
  }
}

module.exports = {
  getTrustScore,
  recalculateTrustScore
}
