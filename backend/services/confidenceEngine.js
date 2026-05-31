function normalizeConfidence(confidence, text) {
  if (typeof confidence === 'number' && !Number.isNaN(confidence)) {
    return Math.max(0, Math.min(100, Math.round(confidence)))
  }

  const safeText = String(text || '')
  const length = safeText.length
  if (length === 0) return 0

  const alphaCount = safeText.replace(/[^a-zA-Z]/g, '').length
  const alphaRatio = alphaCount / Math.max(1, length)
  const lengthFactor = Math.log10(length + 1) * 12
  const ratioFactor = alphaRatio * 60

  const score = Math.round(20 + ratioFactor + lengthFactor)
  return Math.max(10, Math.min(95, score))
}

function evaluateConfidence({ text, confidence }) {
  const normalized = normalizeConfidence(confidence, text)

  let confidenceLevel = 'Low'
  let requiresVerification = true

  if (normalized >= 90) {
    confidenceLevel = 'High'
    requiresVerification = false
  } else if (normalized >= 70) {
    confidenceLevel = 'Medium'
    requiresVerification = false
  }

  return {
    confidenceLevel,
    requiresVerification,
    confidence: normalized,
  }
}

module.exports = {
  evaluateConfidence,
  normalizeConfidence,
}
