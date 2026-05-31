const { db } = require('./firebaseAdmin')
const { evaluateComplianceForUser } = require('./complianceEngine')

let rulesCache = null
let lastRulesFetch = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache

async function getRules() {
  const now = Date.now()
  if (rulesCache && (now - lastRulesFetch < CACHE_TTL)) {
    return rulesCache
  }
  const snap = await db.collection('trafficRules').get()
  const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  rulesCache = list
  lastRulesFetch = now
  return list
}

async function chatWithGemini(userId, question) {
  if (!userId) throw new Error('chatWithGemini: userId is required')
  if (!question || !String(question).trim()) throw new Error('chatWithGemini: question is required')

  // STEP 3: Domain Restriction
  const trafficKeywords = [
    'traffic', 'rule', 'license', 'insurance', 'puc', 'rc', 'fc', 'speed', 'parking', 
    'helmet', 'seatbelt', 'challan', 'fine', 'penalty', 'violation', 'accident', 
    'hazard', 'school', 'hospital', 'readiness', 'trust score', 'sign', 'road', 
    'drive', 'driving', 'signal', 'red light', 'document', 'expiry', 'safety', 'mva', 'motor vehicle'
  ]
  const cleanQuestion = String(question).toLowerCase()
  const isTopicMatched = trafficKeywords.some(kw => cleanQuestion.includes(kw))

  if (!isTopicMatched) {
    const rejectionMsg = 'I can only help with traffic, driving, compliance, challans, and road safety topics.'
    // Even rejected conversations can be logged or directly returned
    await db.collection('assistantConversations').add({
      userId,
      question,
      answer: rejectionMsg,
      createdAt: new Date().toISOString()
    })
    return rejectionMsg
  }

  // Route trust score questions to trustScoreExplainer
  const isTrustScoreQuestion = 
    cleanQuestion.includes('trust score') || 
    cleanQuestion.includes('score low') ||
    cleanQuestion.includes('score increase') ||
    cleanQuestion.includes('score decrease') ||
    cleanQuestion.includes('improve my score') ||
    cleanQuestion.includes('improve score') ||
    cleanQuestion.includes('affecting my score') ||
    cleanQuestion.includes('next level') ||
    cleanQuestion.includes('close to the next') ||
    cleanQuestion.includes('score change')

  if (isTrustScoreQuestion) {
    const { explainTrustScoreWithGemini } = require('./trustScoreExplainer')
    return await explainTrustScoreWithGemini(userId, question)
  }

  // STEP 4: Context Injection (Real Database Context)
  let vehicleType = 'car'
  try {
    const userSnap = await db.collection('users').doc(userId).get()
    if (userSnap.exists) {
      vehicleType = userSnap.data().vehicleType || 'car'
    }
  } catch (err) {
    console.warn('[trafficAssistantService] Failed to fetch user profile:', err.message)
  }

  let complianceScore = 0
  let complianceStatus = 'Unknown'
  let compEval = { readinessScore: 0, status: 'Unknown' }
  try {
    compEval = await evaluateComplianceForUser(userId)
    complianceScore = compEval.readinessScore || 0
    complianceStatus = compEval.status || 'Unknown'
  } catch (err) {
    console.warn('[trafficAssistantService] Failed to evaluate compliance:', err.message)
  }

  let trustScore = 100
  let trustLevel = 'Elite Driver'
  try {
    const trustSnap = await db.collection('trustScores').doc(userId).get()
    if (trustSnap.exists) {
      trustScore = trustSnap.data().score ?? 100
      trustLevel = trustSnap.data().level ?? 'Elite Driver'
    }
  } catch (err) {
    console.warn('[trafficAssistantService] Failed to fetch trust score:', err.message)
  }

  let unpaidChallans = []
  try {
    const challanSnap = await db.collection('challanReports')
      .where('userId', '==', userId)
      .get()
    const challans = challanSnap.docs.map(doc => doc.data())
    unpaidChallans = challans.filter(c => c.status !== 'Paid')
  } catch (err) {
    console.warn('[trafficAssistantService] Failed to query challan reports:', err.message)
  }

  // STEP 5: Rule Grounding
  const rules = await getRules()
  const matchedRules = rules.filter(r => {
    const title = String(r.title || '').toLowerCase()
    const desc = String(r.description || '').toLowerCase()
    return cleanQuestion.includes(title) || 
           cleanQuestion.includes(r.category.toLowerCase()) || 
           (r.keywords && r.keywords.some(k => cleanQuestion.includes(k.toLowerCase())))
  })

  // STEP 1 & 2: Call Gemini API (with deterministic fallback)
  const geminiKey = process.env.GEMINI_API_KEY
  let answer = ''

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
                parts: [
                  {
                    text: `User Context:\n- Vehicle Type: ${vehicleType}\n- Compliance Score: ${complianceScore}%\n- Compliance Status: ${complianceStatus}\n- Driver Trust Score: ${trustScore} (${trustLevel})\n- Outstanding Challans Count: ${unpaidChallans.length}\n\nGrounding MV Act Rules:\n${matchedRules.map(r => `* ${r.title} (Section ${r.sectionReference}): ${r.description} (Compounding Fine: ₹${r.fineAmount})`).join('\n')}\n\nUser Question: "${question}"`
                  }
                ]
              }
            ],
            systemInstruction: {
              parts: [
                {
                  text: "You are Gemini Traffic Assistant, a highly professional AI specializing exclusively in Indian Traffic Rules, Vehicle Compliance, Challans, Road Safety, and Trust Scores. System Instructions:\n1. ONLY answer queries directly related to these topics. If the query is off-topic, respond EXACTLY with: 'I can only help with traffic, driving, compliance, challans, and road safety topics.'\n2. Ground your advice strictly in the provided Grounding MV Act Rules (which is the source of truth). Do not hallucinate fine amounts or legal references.\n3. Base your compliance/trust score guidance on the provided live Driver Context. Explain why their score is in this state.\n4. Explain any uncertainty clearly."
                }
              ]
            }
          })
        }
      )

      if (response.ok) {
        const data = await response.json()
        answer = data?.candidates?.[0]?.content?.parts?.[0]?.text
      } else {
        console.warn('[trafficAssistantService] Gemini API call failed with status:', response.status)
      }
    } catch (err) {
      console.warn('[trafficAssistantService] Gemini API call failed, falling back to heuristic solver:', err.message)
    }
  }

  // STEP 9: Safety & Deterministic Solver Fallback
  if (!answer) {
    const q = cleanQuestion
    if (q.includes('trust score') || q.includes('why is my score')) {
      answer = `Your Driver Trust Score is currently ${trustScore}/100, which classifies you as a "${trustLevel}". This score is calculated dynamically based on:\n1. Compliance Contribution (30% weight): Your compliance index is ${complianceScore}%.\n2. Challan Contribution (30% weight): You have ${unpaidChallans.length} active unpaid challan(s).\n3. Driving Contribution (25% weight): Evaluated from off-route events and hazard warning entries.\n4. Document Health (15% weight): Expirations and notifications response times.\n\nKeep your credentials valid and resolve citations to improve your tier!`
    } else if (q.includes('document') || q.includes('required') || q.includes('what paper')) {
      const docLabels = {
        bike: 'Driving License, Vehicle Insurance, and PUC Certificate',
        car: 'Driving License, Registration Certificate (RC), Vehicle Insurance, and PUC Certificate',
        commercial: 'Driving License, Registration Certificate (RC), Vehicle Insurance, PUC Certificate, and Fitness Certificate (FC)'
      }
      answer = `For a registered vehicle of type "${vehicleType.toUpperCase()}", the Indian Motor Vehicles Act mandates carrying the following valid credentials:\n- ${docLabels[vehicleType] || docLabels.car}.\n\nYour active Compliance Readiness index is currently ${complianceScore}% with status "${complianceStatus}".`
    } else if (q.includes('insurance') && (q.includes('expire') || q.includes('happen'))) {
      const insRule = matchedRules.find(r => r.title.toLowerCase().includes('insurance')) || { sectionReference: '146/196', fineAmount: 2000 }
      answer = `According to the Motor Vehicles Act (Section ${insRule.sectionReference}), driving a vehicle without statutory Third Party Insurance is a serious offense. Penalties include:\n- First Offense Compounding Fine: ₹${insRule.fineAmount}.\n- Imprisonment: Up to 3 months or both.\n- Risk of complete claim rejection in accident scenarios.\n\nRenew your insurance instantly inside the Document Vault to clear active warnings.`
    } else if (q.includes('helmet') || q.includes('ride without')) {
      const helmetRule = matchedRules.find(r => r.title.toLowerCase().includes('helmet')) || { sectionReference: '129/194D', fineAmount: 1000 }
      answer = `Under Section ${helmetRule.sectionReference} of the Motor Vehicles Act, riding a two-wheeler without a Bureau of Indian Standards (BIS) certified safety helmet is prohibited. Penalties include:\n- Compounding Fine: ₹${helmetRule.fineAmount}.\n- Disqualification: Driving License suspension for up to 3 months.\n\nAlways fasten your helmet strap before driving.`
    } else if (q.includes('challan') || q.includes('my challan') || q.includes('fine')) {
      if (unpaidChallans.length === 0) {
        answer = 'You have a clean record! There are 0 active traffic challans logged in your profile.'
      } else {
        const listStr = unpaidChallans.map((c, idx) => `${idx + 1}. Vehicle ${c.vehicleNumber}: ${c.violation} (Fine: ₹${c.fineAmount}, Status: ${c.status})`).join('\n')
        answer = `Our records show you have ${unpaidChallans.length} outstanding citation(s) totaling ₹${unpaidChallans.reduce((a,c) => a + Number(c.fineAmount || 0), 0)}:\n${listStr}\n\nUnder MV Act rules, citations must be cleared within 30 days of registration to avoid court summon escalations.`
      }
    } else {
      // General grounded rule fallback
      if (matchedRules.length > 0) {
        const ruleStr = matchedRules.map(r => `- ${r.title} (Sec ${r.sectionReference}): ${r.description} (Fine: ₹${r.fineAmount})`).join('\n')
        answer = `Grounding traffic rules extracted from the Motor Vehicles Act database:\n${ruleStr}\n\nPlease drive carefully, observe local speed limits, and carry all valid papers inside your digital locker.`
      } else {
        answer = `I am your AI Traffic Assistant. I am grounded in the Motor Vehicles Act rules database. You asked about "${question}". Please carry valid credentials (License, Insurance, PUC, RC) at all times and resolve outstanding traffic challans to boost your trust index.`
      }
    }
  }

  // STEP 8: Save conversation to collection
  await db.collection('assistantConversations').add({
    userId,
    question,
    answer,
    createdAt: new Date().toISOString()
  })

  return answer
}

module.exports = {
  chatWithGemini
}
