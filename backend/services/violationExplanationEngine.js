function buildViolationExplanation({ matchedRule, extractedText }) {
  if (!matchedRule) {
    return {
      violation: null,
      fine: null,
      explanation: null,
      prevention: null,
    }
  }

  const violation = matchedRule.violation || matchedRule.keyword || 'Unspecified Violation'
  const fine = matchedRule.fine || null

  const snippet = String(extractedText || '').slice(0, 180).replace(/\s+/g, ' ').trim()
  const explanationParts = [
    `The challan text references “${matchedRule.matchedKeyword || matchedRule.keyword}”.`,
    matchedRule.section ? `Applicable section: ${matchedRule.section}.` : null,
    snippet ? `Extracted text snippet: “${snippet}”.` : null,
  ].filter(Boolean)

  const prevention = matchedRule.prevention || 'Follow traffic regulations, carry valid documents, and comply with on-road safety guidelines.'

  return {
    violation,
    fine,
    explanation: explanationParts.join(' '),
    prevention,
  }
}

module.exports = {
  buildViolationExplanation,
}
