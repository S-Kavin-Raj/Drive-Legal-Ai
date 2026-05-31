const { db } = require('./firebaseAdmin')
const { getTrustScoreData } = require('./trustScoreEngine')

/**
 * Builds the comprehensive database context for a driver's trust score.
 */
async function buildTrustScoreContext(userId) {
  if (!userId) throw new Error('buildTrustScoreContext: userId is required')

  // 1. Get current trust score (will calculate if missing)
  let scoreData = null
  try {
    scoreData = await getTrustScoreData(userId)
  } catch (err) {
    console.warn('[trustScoreExplainer] Failed to get trust score data:', err.message)
  }

  // 2. Read trustScoreHistory
  let history = []
  try {
    const historySnap = await db.collection('trustScoreHistory')
      .where('userId', '==', userId)
      .get()
    history = historySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } catch (err) {
    console.warn('[trustScoreExplainer] Failed to fetch trust score history:', err.message)
  }

  // 3. Read drivingSessions
  let sessions = []
  try {
    const sessionsSnap = await db.collection('drivingSessions')
      .where('userId', '==', userId)
      .get()
    sessions = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } catch (err) {
    console.warn('[trustScoreExplainer] Failed to fetch driving sessions:', err.message)
  }

  // 4. Read challanReports
  let challans = []
  try {
    const challansSnap = await db.collection('challanReports')
      .where('userId', '==', userId)
      .get()
    challans = challansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (err) {
    console.warn('[trustScoreExplainer] Failed to fetch challan reports:', err.message)
  }

  // 5. Read documents
  let documents = []
  try {
    const docsSnap = await db.collection('documents')
      .where('userId', '==', userId)
      .get()
    documents = docsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (err) {
    console.warn('[trustScoreExplainer] Failed to fetch documents:', err.message)
  }

  return {
    scoreData,
    history,
    sessions,
    challans,
    documents
  }
}

/**
 * Heuristic fallback solver to explain trust score metrics deterministically
 */
function runHeuristicExplanation(question, contextData) {
  const q = String(question).toLowerCase()
  const { scoreData, history, sessions, challans, documents } = contextData

  const currentScore = scoreData ? (scoreData.trustScore ?? scoreData.score ?? 600) : 600
  const grade = scoreData ? (scoreData.grade ?? 'Moderate Risk') : 'Moderate Risk'
  const level = scoreData ? (scoreData.level ?? 'Average Driver') : 'Average Driver'
  const positiveFactors = scoreData?.factors?.positive || []
  const negativeFactors = scoreData?.factors?.negative || []

  let answer = ''

  if (q.includes('why is my score low') || q.includes('why low') || q.includes('affecting my score most') || q.includes('affecting')) {
    answer += `Your Driver Trust Score is currently ${currentScore}/900, which gives you a grade of "${grade}" and places you in the "${level}" tier.\n\n`
    if (negativeFactors.length > 0) {
      answer += `The key factors negatively impacting your score are:\n` + negativeFactors.map(f => `* ${f}`).join('\n') + '\n\n'
    } else {
      answer += `There are no negative factors currently degrading your trust score. Keep maintaining safe driving and document compliance!\n\n`
    }
    if (positiveFactors.length > 0) {
      answer += `The positive factors supporting your score are:\n` + positiveFactors.map(f => `* ${f}`).join('\n')
    }
  } else if (q.includes('increase') || q.includes('improved') || q.includes('why did my score increase')) {
    const positiveHistory = history.filter(h => h.change > 0)
    if (positiveHistory.length > 0) {
      answer += `Based on your recent score history, your score increased for the following reasons:\n` +
        positiveHistory.slice(0, 3).map(h => `* On ${h.createdAt.split('T')[0]}, your score improved by +${h.change} points (reaching ${h.currentScore}) due to: ${h.reason}`).join('\n')
    } else {
      answer += `No recent score increases are recorded in your history. To improve your score, ensure all vehicle documents are up-to-date in the Document Vault and complete driving sessions with clean records.`
    }
  } else if (q.includes('decrease') || q.includes('dropped') || q.includes('why did my score decrease') || q.includes('lowered')) {
    const negativeHistory = history.filter(h => h.change < 0)
    if (negativeHistory.length > 0) {
      answer += `Based on your recent score history, your score decreased for the following reasons:\n` +
        negativeHistory.slice(0, 3).map(h => `* On ${h.createdAt.split('T')[0]}, your score dropped by ${h.change} points (reaching ${h.currentScore}) due to: ${h.reason}`).join('\n')
    } else {
      answer += `No recent score decreases are recorded in your history. Continue keeping a clean, ticket-free record to prevent any future drop.`
    }
  } else if (q.includes('improve') || q.includes('how do i improve')) {
    answer += `To improve your trust score (currently ${currentScore}/900), please address these factors from your profile:\n\n`
    let improvements = []

    const expiredDocs = documents.filter(d => d.status === 'Expired' || d.status === 'Missing')
    if (expiredDocs.length > 0) {
      improvements.push(`* **Document Renewal**: Renew and re-verify your ${expiredDocs.map(d => d.type.toUpperCase()).join(', ')} document(s) in the Document Vault. Currently, they are flagged as expired or missing.`)
    }

    const unpaidChallans = challans.filter(c => c.status !== 'Paid')
    if (unpaidChallans.length > 0) {
      improvements.push(`* **Clear Citations**: Resolve the ${unpaidChallans.length} outstanding traffic challan(s) shown in your Challan Manager to restore your challan sub-score.`)
    }

    const totalWarnings = sessions.reduce((acc, s) => acc + (s.warnings || 0) + (s.violations || 0), 0)
    if (totalWarnings > 0) {
      improvements.push(`* **Safe Driving Behavior**: Observe speed limits and avoid off-route warnings on future trips. Recent sessions show a cumulative count of warnings/violations.`)
    }

    if (improvements.length === 0) {
      improvements.push(`* **Consistent Driving**: Your profile is in excellent standing. Complete more completed trips inside Driving Mode to build consistency history, which contributes 15% to your overall trust score.`)
    }

    answer += improvements.join('\n')
  } else if (q.includes('level') || q.includes('next level') || q.includes('close')) {
    let nextLevel = ''
    let pointsNeeded = 0
    if (currentScore < 500) {
      nextLevel = 'Risk Driver (500 pts)'
      pointsNeeded = 500 - currentScore
    } else if (currentScore < 600) {
      nextLevel = 'Average Driver (600 pts)'
      pointsNeeded = 600 - currentScore
    } else if (currentScore < 700) {
      nextLevel = 'Safe Driver (700 pts)'
      pointsNeeded = 700 - currentScore
    } else if (currentScore < 800) {
      nextLevel = 'Elite Driver (800 pts)'
      pointsNeeded = 800 - currentScore
    }

    if (nextLevel) {
      answer += `You are currently at the "${level}" tier with a score of ${currentScore}/900.\n\nYou are exactly **${pointsNeeded}** point(s) away from the next level, "${nextLevel}". To bridge this gap, ensure all vehicle papers are valid and complete safe trips.`
    } else {
      answer += `You are currently in the highest tier: "${level}" with a trust score of ${currentScore}/900! Keep up the excellent work to maintain your Excellent rating.`
    }
  } else {
    answer += `Driver Trust Score Explainer Summary:\n` +
      `* Score: ${currentScore}/900 (${grade})\n` +
      `* Tier/Level: ${level}\n` +
      `* Document Health: ${documents.filter(d => d.status === 'Valid').length}/${documents.length} valid\n` +
      `* Unpaid Challans: ${challans.filter(c => c.status !== 'Paid').length} active\n\n` +
      `Ask me details like "Why is my score low?", "Why did my score increase?", or "How do I improve my score?".`
  }

  return answer
}

/**
 * Asks Gemini to explain the driver's trust score using grounding data
 */
async function explainTrustScoreWithGemini(userId, question) {
  if (!userId) throw new Error('explainTrustScoreWithGemini: userId is required')

  const contextData = await buildTrustScoreContext(userId)
  const geminiKey = process.env.GEMINI_API_KEY

  const currentScore = contextData.scoreData ? (contextData.scoreData.trustScore ?? contextData.scoreData.score ?? 600) : 600
  const grade = contextData.scoreData ? (contextData.scoreData.grade ?? 'Moderate Risk') : 'Moderate Risk'
  const level = contextData.scoreData ? (contextData.scoreData.level ?? 'Average Driver') : 'Average Driver'
  const positiveFactors = contextData.scoreData?.factors?.positive || []
  const negativeFactors = contextData.scoreData?.factors?.negative || []

  // Recent changes
  const recentChangesText = contextData.history.slice(0, 5).map(h => {
    return `- Date: ${h.createdAt.split('T')[0]}, Change: ${h.change > 0 ? '+' : ''}${h.change} pts (from ${h.previousScore} to ${h.currentScore}). Reason: ${h.reason}`
  }).join('\n') || 'No recent trust score changes recorded.'

  // Recent driving sessions
  const drivingSessionsText = contextData.sessions.slice(0, 5).map(s => {
    return `- Date: ${s.createdAt ? s.createdAt.split('T')[0] : 'N/A'}, Distance: ${s.distance || 0} km, Warnings: ${s.warnings || 0}, Violations: ${s.violations || 0}, Safety Score: ${s.safetyScore ?? 100}`
  }).join('\n') || 'No driving sessions recorded.'

  // Challans
  const challansText = contextData.challans.map(c => {
    return `- Violation: ${c.violation || 'N/A'}, Amount: ₹${c.fineAmount || 0}, Status: ${c.status || 'N/A'}, Verification: ${c.verificationStatus || 'N/A'}, Date: ${c.date || 'N/A'}`
  }).join('\n') || 'No traffic challans recorded.'

  // Documents
  const documentsText = contextData.documents.map(d => {
    return `- Type: ${d.type}, Status: ${d.status}, Expiry: ${d.expiryDate || 'N/A'}`
  }).join('\n') || 'No compliance documents uploaded.'

  // Grounding prompt
  const userContextPrompt = `User Question: "${question}"

Here is the actual, live driver trust score and compliance data from the database:
1. Trust Score Profile:
- Current Trust Score: ${currentScore} / 900
- Current Grade: ${grade}
- Assigned Tier/Level: ${level}
- Positive Factors (from trust engine):
${positiveFactors.map(f => `  * ${f}`).join('\n') || '  * None'}
- Negative Factors (from trust engine):
${negativeFactors.map(f => `  * ${f}`).join('\n') || '  * None'}

2. Trust Score History & Recent Changes:
${recentChangesText}

3. Driving Sessions (Last 5):
${drivingSessionsText}

4. Traffic Challan Reports:
${challansText}

5. Document Vault Compliance:
${documentsText}
`

  const systemInstructionText = `You are the Gemini Driver Trust Score Explainer, a highly professional assistant integrated into DriveLegal AI.
Your sole job is to explain the user's trust score and give clear, actionable advice.

Rules:
1. Rely ONLY on the actual database records provided.
2. NEVER invent numbers (such as fake scores, fake fine amounts, or fake dates).
3. NEVER invent violations, alerts, or driving sessions.
4. NEVER invent challans.
5. Always cite the score factors (such as expired papers, consistency volume, warnings) that are present in the provided context.
6. When explaining "How close am I to the next level?", use these tier bounds:
   - Risk Driver: 500-599
   - Average Driver: 600-699
   - Safe Driver: 700-799
   - Elite Driver: >= 800
   State their current level/tier, the next tier up, and compute the exact points difference between their currentScore and the next tier's start.
7. Keep responses concise, compliant, and extremely precise.`

  if (geminiKey && geminiKey.trim() !== '') {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: userContextPrompt }]
              }
            ],
            systemInstruction: {
              parts: [{ text: systemInstructionText }]
            }
          })
        }
      )

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text && text.trim() !== '') {
          // Save explanation to assistantConversations for audit trail
          await db.collection('assistantConversations').add({
            userId,
            question,
            answer: text,
            createdAt: new Date().toISOString(),
            isTrustScoreExplanation: true
          })
          return text
        }
      } else {
        console.warn('[trustScoreExplainer] Gemini API returned status:', response.status)
      }
    } catch (err) {
      console.warn('[trustScoreExplainer] Gemini API call failed:', err.message)
    }
  }

  // Fallback heuristic solver
  const answer = runHeuristicExplanation(question, contextData)
  
  // Save explanation to assistantConversations
  try {
    await db.collection('assistantConversations').add({
      userId,
      question,
      answer,
      createdAt: new Date().toISOString(),
      isTrustScoreExplanation: true,
      heuristicFallback: true
    })
  } catch (err) {
    console.warn('[trustScoreExplainer] Failed to save conversation history:', err.message)
  }

  return answer
}

module.exports = {
  explainTrustScoreWithGemini,
  buildTrustScoreContext
}
