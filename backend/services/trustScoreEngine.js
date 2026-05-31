const { db } = require('./firebaseAdmin')
const { evaluateComplianceForUser } = require('./complianceEngine')

/**
 * Driver Trust Score Engine — Phase 11
 *
 * Score range: 300 – 900
 *
 * Weights:
 *   Compliance Score    25%
 *   Driving Behavior    35%
 *   Challan History     25%
 *   Driving Consistency 15%
 *
 * Grade mapping:
 *   900         Excellent
 *   800–899     Very Good
 *   700–799     Good
 *   600–699     Moderate Risk
 *   500–599     High Risk
 *   <500        Unsafe
 */

// ─── Grade lookup ────────────────────────────────────────────────────────────
function getGrade(score) {
  if (score >= 900) return 'Excellent'
  if (score >= 800) return 'Very Good'
  if (score >= 700) return 'Good'
  if (score >= 600) return 'Moderate Risk'
  if (score >= 500) return 'High Risk'
  return 'Unsafe'
}

// ─── Scale a 0-100 sub-score into 300-900 range ──────────────────────────────
function scaleToRange(normalised) {
  // normalised is 0 – 100 → map to 300 – 900
  return Math.round(300 + (normalised / 100) * 600)
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. COMPLIANCE SUB-SCORE (25%)
// ═════════════════════════════════════════════════════════════════════════════
async function computeComplianceScore(userId) {
  let readiness = 0
  let validDocs = 0
  let totalDocs = 4
  let expiredDocs = 0
  let missingDocs = 0
  const factors = { positive: [], negative: [] }

  try {
    const evaluation = await evaluateComplianceForUser(userId)
    readiness = evaluation.readinessScore || 0

    if (evaluation.documentStatusMap) {
      const entries = Object.entries(evaluation.documentStatusMap)
      totalDocs = entries.length
      entries.forEach(([key, status]) => {
        if (status === 'Valid') validDocs++
        else if (status === 'Expired') expiredDocs++
        else if (status === 'Missing') missingDocs++
      })
    }
  } catch (err) {
    console.warn('[trustScoreEngine] Compliance fetch failed:', err.message)
  }

  // Score: base from readiness, penalise expired/missing
  let raw = readiness
  raw -= expiredDocs * 15
  raw -= missingDocs * 10
  raw = Math.max(0, Math.min(100, raw))

  if (validDocs === totalDocs) {
    factors.positive.push('All required vehicle credentials are 100% valid.')
  } else {
    if (expiredDocs > 0) factors.negative.push(`${expiredDocs} document(s) expired.`)
    if (missingDocs > 0) factors.negative.push(`${missingDocs} document(s) missing from vault.`)
  }

  return { raw, factors, validDocs, totalDocs, expiredDocs, missingDocs }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. DRIVING BEHAVIOR SUB-SCORE (35%)
// ═════════════════════════════════════════════════════════════════════════════
async function computeDrivingScore(userId) {
  let speedViolations = 0
  let offRouteIncidents = 0
  let schoolZoneWarnings = 0
  let hospitalZoneWarnings = 0
  let accidentZoneWarnings = 0
  const factors = { positive: [], negative: [] }

  try {
    const eventsSnap = await db.collection('drivingEvents')
      .where('userId', '==', userId)
      .get()

    eventsSnap.docs.forEach(doc => {
      const e = doc.data()
      switch (e.type) {
        case 'SPEED_WARNING':   speedViolations++; break
        case 'OFF_ROUTE':       offRouteIncidents++; break
        case 'SCHOOL_ZONE':     schoolZoneWarnings++; break
        case 'HOSPITAL_ZONE':   hospitalZoneWarnings++; break
        case 'ACCIDENT_ZONE':   accidentZoneWarnings++; break
        default: break
      }
    })
  } catch (err) {
    console.warn('[trustScoreEngine] Driving events fetch failed:', err.message)
  }

  // Penalties: speed = 8pt, off-route = 10pt, zone warnings = 5pt each
  const penalties =
    speedViolations * 8 +
    offRouteIncidents * 10 +
    schoolZoneWarnings * 5 +
    hospitalZoneWarnings * 5 +
    accidentZoneWarnings * 5

  const raw = Math.max(0, Math.min(100, 100 - penalties))

  const totalWarnings = speedViolations + offRouteIncidents +
    schoolZoneWarnings + hospitalZoneWarnings + accidentZoneWarnings

  if (totalWarnings === 0) {
    factors.positive.push('Zero driving violations recorded.')
  } else {
    if (speedViolations > 0) factors.negative.push(`${speedViolations} speed violation(s) logged.`)
    if (offRouteIncidents > 0) factors.negative.push(`${offRouteIncidents} off-route incident(s).`)
    const zoneTotal = schoolZoneWarnings + hospitalZoneWarnings + accidentZoneWarnings
    if (zoneTotal > 0) factors.negative.push(`${zoneTotal} restricted zone warning(s).`)
  }

  return {
    raw, factors,
    speedViolations, offRouteIncidents,
    schoolZoneWarnings, hospitalZoneWarnings, accidentZoneWarnings
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. CHALLAN HISTORY SUB-SCORE (25%)
// ═════════════════════════════════════════════════════════════════════════════
async function computeChallanScore(userId) {
  let totalChallans = 0
  let paidCount = 0
  let unpaidCount = 0
  let overdueCount = 0
  let suspiciousCount = 0
  const factors = { positive: [], negative: [] }

  try {
    const challanSnap = await db.collection('challanReports')
      .where('userId', '==', userId)
      .get()

    const challans = challanSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    totalChallans = challans.length

    challans.forEach(c => {
      if (c.status === 'Paid') paidCount++
      else unpaidCount++

      if (c.status === 'Overdue') overdueCount++
      if (c.verificationStatus === 'Suspicious') suspiciousCount++
    })
  } catch (err) {
    console.warn('[trustScoreEngine] Challans fetch failed:', err.message)
  }

  // Penalties: overdue = 20pt, unpaid = 10pt, suspicious = 15pt
  const penalties =
    overdueCount * 20 +
    (unpaidCount - overdueCount) * 10 +
    suspiciousCount * 15

  const raw = Math.max(0, Math.min(100, 100 - penalties))

  if (totalChallans === 0) {
    factors.positive.push('Clean driving record — zero citations.')
  } else if (unpaidCount === 0) {
    factors.positive.push(`All ${totalChallans} challan(s) paid in full.`)
  } else {
    if (overdueCount > 0) factors.negative.push(`${overdueCount} overdue challan(s) pending.`)
    if (unpaidCount > 0) factors.negative.push(`${unpaidCount} unpaid citation(s).`)
    if (suspiciousCount > 0) factors.negative.push(`${suspiciousCount} challan(s) flagged suspicious.`)
  }

  return {
    raw, factors,
    totalChallans, paidCount, unpaidCount, overdueCount, suspiciousCount
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. DRIVING CONSISTENCY SUB-SCORE (15%)
// ═════════════════════════════════════════════════════════════════════════════
async function computeConsistencyScore(userId) {
  let completedTrips = 0
  let safeSessions = 0
  let totalSafetyScore = 0
  const factors = { positive: [], negative: [] }

  try {
    const sessionsSnap = await db.collection('drivingSessions')
      .where('userId', '==', userId)
      .where('status', '==', 'Completed')
      .get()

    completedTrips = sessionsSnap.size

    sessionsSnap.docs.forEach(doc => {
      const s = doc.data()
      const score = s.safetyScore ?? 100
      totalSafetyScore += score
      if (score >= 80) safeSessions++
    })
  } catch (err) {
    console.warn('[trustScoreEngine] Sessions fetch failed:', err.message)
  }

  if (completedTrips === 0) {
    // New user with no trips — neutral score
    factors.negative.push('No completed driving sessions recorded.')
    return { raw: 50, factors, completedTrips, safeSessions, avgSafetyScore: 0 }
  }

  const avgSafetyScore = Math.round(totalSafetyScore / completedTrips)
  const safeRatio = safeSessions / completedTrips

  // Base from average safety score, bonus for safe ratio
  let raw = avgSafetyScore
  raw += Math.round(safeRatio * 15)            // up to +15 for all safe
  raw += Math.min(10, completedTrips)           // up to +10 for volume
  raw = Math.max(0, Math.min(100, raw))

  if (safeRatio >= 0.8) {
    factors.positive.push(`${safeSessions}/${completedTrips} sessions rated safe.`)
  } else if (safeRatio < 0.5 && completedTrips >= 3) {
    factors.negative.push(`Only ${safeSessions}/${completedTrips} sessions rated safe.`)
  }

  if (completedTrips >= 5) {
    factors.positive.push(`${completedTrips} trips completed — consistent driver.`)
  }

  return { raw, factors, completedTrips, safeSessions, avgSafetyScore }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN: calculateTrustScore
// ═════════════════════════════════════════════════════════════════════════════
async function calculateTrustScore(userId) {
  if (!userId) throw new Error('calculateTrustScore: userId is required')

  console.log(`[trustScoreEngine] Calculating trust score for user: ${userId}`)

  // Compute all four sub-scores in parallel
  const [compliance, driving, challan, consistency] = await Promise.all([
    computeComplianceScore(userId),
    computeDrivingScore(userId),
    computeChallanScore(userId),
    computeConsistencyScore(userId),
  ])

  // Weighted combination (0-100 normalised)
  const weightedNormalised =
    0.25 * compliance.raw +
    0.35 * driving.raw +
    0.25 * challan.raw +
    0.15 * consistency.raw

  // Scale to 300-900
  const trustScore = scaleToRange(Math.round(weightedNormalised))
  const grade = getGrade(trustScore)

  // Sub-scores also scaled to 300-900 for display
  const complianceScore  = scaleToRange(compliance.raw)
  const drivingScore     = scaleToRange(driving.raw)
  const challanScore     = scaleToRange(challan.raw)
  const consistencyScore = scaleToRange(consistency.raw)

  // Merge all factors
  const positiveFactors = [
    ...compliance.factors.positive,
    ...driving.factors.positive,
    ...challan.factors.positive,
    ...consistency.factors.positive,
  ].slice(0, 4)

  const negativeFactors = [
    ...compliance.factors.negative,
    ...driving.factors.negative,
    ...challan.factors.negative,
    ...consistency.factors.negative,
  ].slice(0, 4)

  // Determine level text (backward compat with existing dashboard)
  let level = 'High Risk Driver'
  if (trustScore >= 800) level = 'Elite Driver'
  else if (trustScore >= 700) level = 'Safe Driver'
  else if (trustScore >= 600) level = 'Average Driver'
  else if (trustScore >= 500) level = 'Risk Driver'

  // Achievements
  const achievements = []
  if (trustScore >= 700) {
    achievements.push({ id: 'safe_driver', title: 'Safe Driver', description: 'Maintained Good or better trust rating.' })
  }
  if (trustScore >= 800) {
    achievements.push({ id: 'elite_driver', title: 'Elite Driver', description: 'Achieved Very Good or Excellent trust rating.' })
  }
  if (compliance.raw === 100) {
    achievements.push({ id: 'full_compliance', title: '100% Compliance', description: 'All vehicle credentials valid and updated.' })
  }
  if (challan.totalChallans === 0 || challan.unpaidCount === 0) {
    achievements.push({ id: 'clean_record', title: 'Clean Record', description: 'Zero outstanding citations.' })
  }

  return {
    userId,
    trustScore,
    score: trustScore,  // backward compat alias
    grade,
    level,
    complianceScore,
    drivingScore,
    challanScore,
    consistencyScore,
    breakdown: {
      compliance: { score: complianceScore, raw: compliance.raw, weight: '25%', details: compliance },
      driving:    { score: drivingScore,    raw: driving.raw,    weight: '35%', details: driving },
      challan:    { score: challanScore,    raw: challan.raw,    weight: '25%', details: challan },
      consistency:{ score: consistencyScore,raw: consistency.raw,weight: '15%', details: consistency },
    },
    factors: {
      positive: positiveFactors,
      negative: negativeFactors,
    },
    achievements,
    lastCalculatedAt: new Date().toISOString(),
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// getTrustScore — read from Firestore, or calculate if missing
// ═════════════════════════════════════════════════════════════════════════════
async function getTrustScoreData(userId) {
  if (!userId) throw new Error('getTrustScore: userId is required')

  try {
    const snap = await db.collection('trustScores').doc(userId).get()
    if (snap.exists) {
      const data = snap.data()
      return { ...data, exists: true }
    }
  } catch (err) {
    console.warn('[trustScoreEngine] Failed to read trust score doc:', err.message)
  }

  // First-time calculation
  return recalculateUserTrustScore(userId)
}

// ═════════════════════════════════════════════════════════════════════════════
// recalculateUserTrustScore — compute + persist + history
// ═════════════════════════════════════════════════════════════════════════════
async function recalculateUserTrustScore(userId) {
  const result = await calculateTrustScore(userId)

  // Read previous for history delta
  let previousScore = 600 // default for new users
  try {
    const prevSnap = await db.collection('trustScores').doc(userId).get()
    if (prevSnap.exists) {
      previousScore = prevSnap.data().trustScore ?? prevSnap.data().score ?? 600
    }
  } catch (err) {
    console.warn('[trustScoreEngine] Failed to read previous score:', err.message)
  }

  const change = result.trustScore - previousScore

  // Write history entry if score changed
  if (change !== 0) {
    let reason = `Trust score ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} points.`
    if (change > 0) reason = 'Score improved due to compliance updates or safe driving.'
    else reason = 'Score decreased due to violations, challans, or expired documents.'

    try {
      await db.collection('trustScoreHistory').add({
        userId,
        previousScore,
        currentScore: result.trustScore,
        change,
        reason,
        createdAt: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('[trustScoreEngine] Failed to write history:', err.message)
    }
  }

  // Save current score document
  try {
    await db.collection('trustScores').doc(userId).set(result)
  } catch (err) {
    console.warn('[trustScoreEngine] Failed to write trust score doc:', err.message)
  }

  return { ...result, previousScore, change }
}

module.exports = {
  calculateTrustScore,
  getTrustScoreData,
  recalculateUserTrustScore,
}
