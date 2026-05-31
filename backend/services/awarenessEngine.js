const { admin, db } = require('./firebaseAdmin')

async function fetchCollectionCount({ collectionName, userId }) {
  const snapshot = await db.collection(collectionName).where('userId', '==', userId).get()
  return snapshot.docs.map((doc) => doc.data())
}

/**
 * Computes the driver awareness score.
 * 
 * Formula:
 *   Route Contribution = routeAnalysesCount * 2
 *   Compliance Contribution = complianceChecksCount * 3
 *   Challan Contribution = challansUnderstoodCount * 5
 * 
 *   Raw Score = Route Contribution + Compliance Contribution + Challan Contribution
 *   Normalized Score = Min(100, Max(0, Round(Raw Score)))
 * 
 * Normalization ensures a final score scale of 0 to 100.
 */
function computeScore({ routeAnalysesCount, complianceChecksCount, challansUnderstoodCount }) {
  const routeContribution = routeAnalysesCount * 2
  const complianceContribution = complianceChecksCount * 3
  const challanContribution = challansUnderstoodCount * 5

  const rawScore = routeContribution + complianceContribution + challanContribution
  const awarenessScore = Math.min(100, Math.max(0, Math.round(rawScore)))

  return {
    awarenessScore,
    rawScore,
    contributions: {
      routeAnalyses: routeContribution,
      complianceChecks: complianceContribution,
      challansUnderstood: challanContribution,
    },
  }
}

function resolveLevel(score) {
  if (score <= 40) return 'Beginner Driver'
  if (score <= 70) return 'Aware Driver'
  return 'Compliance Champion'
}

function countChallansUnderstood(challanReports) {
  if (!Array.isArray(challanReports)) return 0
  return challanReports.filter((report) => {
    if (report.requiresVerification === false) return true
    if (report.requiresVerification === true) return false
    const confidence = report.confidence ?? (typeof report.confidenceLevel === 'number' ? report.confidenceLevel : null)
    if (confidence !== null) {
      return confidence >= 70
    }
    if (report.confidenceLevel === 'High' || report.confidenceLevel === 'Medium') return true
    return false
  }).length
}

async function getPreviousAwareness(userId) {
  try {
    const snapshot = await db
      .collection('awarenessScores')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  } catch (err) {
    console.warn('[awarenessEngine] getPreviousAwareness failed, returning null. Error:', err && err.message)
    // Firestore may require composite indexes in dev; return null so evaluation proceeds
    return null
  }
}

async function evaluateAwareness(userId) {
  if (!userId) {
    throw new Error('userId is required for awareness evaluation.')
  }

  const [routeAnalyses, complianceHistory, challanReports] = await Promise.all([
    fetchCollectionCount({ collectionName: 'routeAnalyses', userId }),
    fetchCollectionCount({ collectionName: 'complianceHistory', userId }),
    fetchCollectionCount({ collectionName: 'challanReports', userId }),
  ])

  const routeAnalysesCount = routeAnalyses.length
  const complianceChecksCount = complianceHistory.length
  const challansUnderstoodCount = countChallansUnderstood(challanReports)

  const scoreResult = computeScore({
    routeAnalysesCount,
    complianceChecksCount,
    challansUnderstoodCount,
  })

  const level = resolveLevel(scoreResult.awarenessScore)

  const previous = await getPreviousAwareness(userId)
  const previousScore = previous?.score ?? null
  const scoreDelta = previousScore === null ? null : scoreResult.awarenessScore - previousScore
  const trend = scoreDelta === null ? 'Stable' : scoreDelta > 1 ? 'Up' : scoreDelta < -1 ? 'Down' : 'Stable'
  const growthPercent = previousScore && previousScore > 0 ? Number(((scoreDelta / previousScore) * 100).toFixed(2)) : null

  const factors = [
    { source: 'routeAnalyses', contribution: scoreResult.contributions.routeAnalyses },
    { source: 'complianceHistory', contribution: scoreResult.contributions.complianceChecks },
    { source: 'challanReports', contribution: scoreResult.contributions.challansUnderstood },
  ]

  if (Number.isNaN(scoreResult.awarenessScore)) {
    throw new Error('awareness score is required.')
  }

  const payload = {
    userId,
    score: scoreResult.awarenessScore,
    level,
    factors,
    trend,
    scoreDelta,
    growthPercent,
    rawScore: scoreResult.rawScore,
    routeAnalysesCount,
    complianceChecksCount,
    challansUnderstoodCount,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  }

  const docRef = await db.collection('awarenessScores').add(payload)

  return {
    id: docRef.id,
    awarenessScore: scoreResult.awarenessScore,
    level,
    factors,
    trend,
    growthPercent,
    scoreDelta,
  }
}

async function getAwarenessHistory(userId, limit = 20) {
  if (!userId) {
    throw new Error('userId is required for awareness history.')
  }
  try {
    const snapshot = await db
      .collection('awarenessScores')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  } catch (err) {
    console.warn('[awarenessEngine] getAwarenessHistory failed, returning empty array. Error:', err && err.message)
    return []
  }
}

module.exports = {
  evaluateAwareness,
  getAwarenessHistory,
}
