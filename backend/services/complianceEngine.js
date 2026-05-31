const { admin, db } = require('./firebaseAdmin')

const VEHICLE_DOC_REQUIREMENTS = {
  bike: ['license', 'insurance', 'puc'],
  car: ['license', 'rc', 'insurance', 'puc'],
  commercial: ['license', 'rc', 'insurance', 'puc', 'fc']
}

const SUPPORTED_TYPES = ['license', 'rc', 'insurance', 'puc', 'fc']
const DEFAULT_WARNING_DAYS = Number(process.env.COMPLIANCE_EXPIRY_WARNING_DAYS || 30)

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value.toDate === 'function') return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function daysBetweenNow(date) {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function normalizeDocument(doc) {
  const type = String(doc.type || '').toLowerCase()
  const expiryDate = toDate(doc.expiryDate)
  const uploadedAt = toDate(doc.uploadedAt)

  return {
    id: doc.id || null,
    userId: doc.userId || doc.uid || null,
    type,
    expiryDate,
    uploadedAt,
    fileUrl: doc.fileUrl || null,
    status: doc.status || 'Valid',
  }
}

function evaluateCompliance(documents, vehicleType = 'car') {
  const reqs = VEHICLE_DOC_REQUIREMENTS[vehicleType] || VEHICLE_DOC_REQUIREMENTS.car
  const byType = new Map()

  documents.forEach((doc) => {
    const docType = String(doc.type || '').toLowerCase()
    if (!reqs.includes(docType)) return
    const existing = byType.get(docType)

    if (!existing) {
      byType.set(docType, doc)
      return
    }

    const existingUploadedAt = existing.uploadedAt ? existing.uploadedAt.getTime() : 0
    const incomingUploadedAt = doc.uploadedAt ? doc.uploadedAt.getTime() : 0
    if (incomingUploadedAt >= existingUploadedAt) {
      byType.set(docType, doc)
    }
  })

  let validCount = 0
  const issues = []
  const expiringSoon = []
  const documentStatusMap = {}

  reqs.forEach((type) => {
    const doc = byType.get(type)

    if (!doc) {
      documentStatusMap[type] = 'Missing'
      issues.push({
        type,
        status: 'Missing',
        message: `${type.toUpperCase()} document is missing.`,
      })
      return
    }

    if (!doc.expiryDate) {
      documentStatusMap[type] = 'Invalid'
      issues.push({
        type,
        status: 'Invalid',
        message: `${type.toUpperCase()} document has no valid expiry date.`,
      })
      return
    }

    const daysLeft = daysBetweenNow(doc.expiryDate)

    if (daysLeft < 0) {
      documentStatusMap[type] = 'Expired'
      issues.push({
        type,
        status: 'Expired',
        message: `${type.toUpperCase()} has expired.`,
        expiredByDays: Math.abs(daysLeft),
      })
      return
    }

    documentStatusMap[type] = 'Valid'
    validCount++

    if (daysLeft <= DEFAULT_WARNING_DAYS) {
      expiringSoon.push({
        type,
        expiryDate: doc.expiryDate,
        daysRemaining: daysLeft,
      })
    }
  })

  const readinessScore = reqs.length > 0 ? Math.round((validCount / reqs.length) * 100) : 0
  const status = issues.some((issue) => ['Missing', 'Expired', 'Invalid'].includes(issue.status))
    ? 'Not Ready'
    : 'Ready'

  return {
    readinessScore,
    status,
    issues,
    expiringSoon,
    documents: byType,
    documentStatusMap,
    evaluatedAt: new Date().toISOString(),
  }
}

async function getUserDocuments(userId) {
  try {
    const snapshot = await db.collection('documents').where('userId', '==', userId).get()
    return snapshot.docs.map((doc) => normalizeDocument({ id: doc.id, ...doc.data() }))
  } catch (err) {
    console.warn('[complianceEngine] getUserDocuments failed, returning empty list. Error:', err && err.message)
    return []
  }
}

async function storeComplianceHistory(userId, evaluation, documents) {
  const historyRef = await db.collection('complianceHistory').add({
    userId,
    readinessScore: evaluation.readinessScore,
    status: evaluation.status,
    issues: evaluation.issues,
    expiringSoon: evaluation.expiringSoon,
    documentStatusMap: evaluation.documentStatusMap,
    documents: documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      expiryDate: doc.expiryDate,
      uploadedAt: doc.uploadedAt,
    })),
    evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
    source: 'compliance-engine',
  })

  return historyRef.id
}

async function evaluateComplianceForUser(userId) {
  if (!userId) {
    throw new Error('userId is required')
  }

  let vehicleType = 'car'
  try {
    const userSnap = await db.collection('users').doc(userId).get()
    if (userSnap.exists) {
      vehicleType = userSnap.data().vehicleType || 'car'
    }
  } catch (err) {
    console.warn('[complianceEngine] Failed to fetch user profile, using fallback vehicleType="car":', err.message)
  }

  const documents = await getUserDocuments(userId)
  const evaluation = evaluateCompliance(documents, vehicleType)
  const historyId = await storeComplianceHistory(userId, evaluation, documents)

  return {
    ...evaluation,
    historyId,
    documents: documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      expiryDate: doc.expiryDate,
      uploadedAt: doc.uploadedAt,
    })),
  }
}

async function getComplianceHistoryForUser(userId, limit = 10) {
  if (!userId) {
    throw new Error('userId is required')
  }
  try {
    const snapshot = await db
      .collection('complianceHistory')
      .where('userId', '==', userId)
      .orderBy('evaluatedAt', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  } catch (err) {
    console.warn('[complianceEngine] getComplianceHistoryForUser failed, returning empty array. Error:', err && err.message)
    return []
  }
}

module.exports = {
  evaluateCompliance,
  evaluateComplianceForUser,
  getComplianceHistoryForUser,
  SUPPORTED_TYPES,
}
