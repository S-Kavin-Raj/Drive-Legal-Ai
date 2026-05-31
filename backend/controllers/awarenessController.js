const { evaluateAwareness, getAwarenessHistory } = require('../services/awarenessEngine')
const { db } = require('../services/firebaseAdmin')

let rulesCache = null
let lastCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache

async function getCachedRules() {
  const now = Date.now()
  if (rulesCache && (now - lastCacheTime < CACHE_TTL)) {
    return rulesCache
  }
  const snapshot = await db.collection('trafficRules').get()
  const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  rulesCache = rules
  lastCacheTime = now
  return rules
}

async function searchTrafficRules(req, res) {
  try {
    const q = String(req.query.q || '').trim().toLowerCase()
    const category = String(req.query.category || '').trim().toLowerCase()
    const rules = await getCachedRules()

    let filtered = rules
    if (q) {
      filtered = filtered.filter(rule => {
        const title = String(rule.title || '').toLowerCase()
        const desc = String(rule.description || '').toLowerCase()
        const ref = String(rule.sectionReference || '').toLowerCase()
        const kws = Array.isArray(rule.keywords) 
          ? rule.keywords.map(k => String(k).toLowerCase())
          : []

        return title.includes(q) || 
               desc.includes(q) || 
               ref.includes(q) || 
               kws.some(kw => kw.includes(q))
      })
    }

    if (category && category !== 'all') {
      filtered = filtered.filter(rule => 
        String(rule.category || '').toLowerCase() === category
      )
    }

    return res.json({ rules: filtered })
  } catch (error) {
    console.error('Search traffic rules error:', error)
    return res.status(500).json({ error: error.message || 'Failed to search traffic rules.' })
  }
}

async function evaluateAwarenessScore(req, res) {
  try {
    console.log('[backend] /api/awareness/evaluate received. headers:', JSON.stringify(req.headers));
    console.log('[backend] body:', JSON.stringify(req.body));
    const userId = req.user?.userId || req.body?.userId || req.params?.userId
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    const result = await evaluateAwareness(userId)
    return res.json(result)
  } catch (error) {
    console.error('Awareness evaluation error:', error)
    const msg = error && (error.message || (error.details && error.details)) || ''
    if ((error && error.code === 9) || msg.includes('requires an index') || msg.includes('FAILED_PRECONDITION')) {
      console.warn('[awarenessController] Firestore index required - returning minimal awareness result for UX stability.')
      return res.json({ awarenessScore: 0, id: null, level: 'Beginner Driver', factors: [], trend: 'Stable', scoreDelta: null, growthPercent: null })
    }
    return res.status(500).json({ error: error.message || 'Failed to evaluate awareness.' })
  }
}

async function getAwarenessHistoryHandler(req, res) {
  try {
    const userId = req.user?.userId || req.body?.userId || req.params?.userId
    const limit = Number(req.query.limit || 20)
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    const history = await getAwarenessHistory(userId, limit)
    return res.json({ history })
  } catch (error) {
    console.error('Awareness history error:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch awareness history.' })
  }
}

const { chatWithGemini } = require('../services/trafficAssistantService')

async function handleTrafficAssistantChat(req, res) {
  try {
    const userId = req.user?.userId || req.body?.userId
    const { question } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'question is required.' })
    }

    const answer = await chatWithGemini(userId, question)
    return res.json({ answer })
  } catch (error) {
    console.error('Traffic Assistant Chat error:', error)
    return res.status(500).json({ error: error.message || 'Failed to chat with Traffic Assistant.' })
  }
}

module.exports = {
  evaluateAwarenessScore,
  getAwarenessHistoryHandler,
  searchTrafficRules,
  handleTrafficAssistantChat
}
