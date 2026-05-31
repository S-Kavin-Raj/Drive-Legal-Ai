const { db } = require('./firebaseAdmin')
const { fuzzy } = require('fast-fuzzy')

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
}

async function fetchTrafficRules() {
  const snapshot = await db.collection('trafficRules').get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

function buildRuleCandidates(rule) {
  const keywords = []
  if (rule.keyword) keywords.push(rule.keyword)
  if (Array.isArray(rule.synonyms)) {
    keywords.push(...rule.synonyms)
  }

  return keywords
    .map((keyword) => String(keyword || '').toLowerCase().trim())
    .filter(Boolean)
}

function scoreRule({ text, rule }) {
  const normalizedText = normalizeText(text)
  const candidates = buildRuleCandidates(rule)

  let best = { score: 0, matchedKeyword: null, matchMethod: null }

  candidates.forEach((keyword) => {
    if (!keyword) return

    if (normalizedText.includes(keyword)) {
      best = { score: 1, matchedKeyword: keyword, matchMethod: 'keyword' }
      return
    }

    const similarity = fuzzy(keyword, normalizedText)
    if (similarity > best.score) {
      best = { score: similarity, matchedKeyword: keyword, matchMethod: 'fuzzy' }
    }
  })

  return best
}

async function matchTrafficRule(text) {
  const rules = await fetchTrafficRules()
  if (!rules.length) return null

  let bestMatch = null
  let bestScore = 0

  rules.forEach((rule) => {
    const scored = scoreRule({ text, rule })
    if (scored.score > bestScore) {
      bestScore = scored.score
      bestMatch = {
        rule,
        score: scored.score,
        matchedKeyword: scored.matchedKeyword,
        matchMethod: scored.matchMethod,
      }
    }
  })

  if (!bestMatch || bestScore <= 0) return null

  return {
    id: bestMatch.rule.id,
    keyword: bestMatch.rule.keyword || null,
    violation: bestMatch.rule.violation || null,
    fine: bestMatch.rule.fine || null,
    matchedKeyword: bestMatch.matchedKeyword,
    matchMethod: bestMatch.matchMethod,
    matchScore: Number(bestMatch.score.toFixed(4)),
    ruleText: bestMatch.rule.ruleText || null,
    section: bestMatch.rule.section || null,
  }
}

module.exports = {
  matchTrafficRule,
}
