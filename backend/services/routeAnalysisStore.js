const { admin, db } = require('./firebaseAdmin')

async function saveRouteAnalysis(payload) {
  if (!payload?.userId) {
    throw new Error('userId is required to persist route analyses.')
  }
  try {
    const docData = {
      userId: payload.userId,
      source: payload.source,
      destination: payload.destination,
      distance: Number(payload.routeTelemetry?.distance) || 0,
      duration: Number(payload.routeTelemetry?.duration) || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    console.log(`[routeAnalysisStore] Saving simplified route analysis for userId=${payload.userId}:`, docData)

    const docRef = await db.collection('routeAnalyses').add(docData)
    return docRef.id
  } catch (err) {
    console.error('[routeAnalysisStore] Failed to save route analysis:', err && (err.stack || err.message))
    throw err
  }
}

module.exports = {
  saveRouteAnalysis,
}
