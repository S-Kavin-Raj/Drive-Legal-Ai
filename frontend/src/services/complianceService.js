import { apiClient } from './apiClient'
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

export async function evaluateCompliance(userId) {
  try {
    const response = await apiClient.post('/api/compliance/evaluate', { userId })
    return response.data
  } catch (error) {
    console.error('evaluateCompliance API error:', error)
    throw error
  }
}

export async function fetchComplianceHistory(userId, limit = 10) {
  try {
    const response = await apiClient.get(`/api/compliance/history/${userId}`, {
      params: { limit },
    })
    return response.data
  } catch (error) {
    console.error('fetchComplianceHistory API error:', error)
    throw error
  }
}

export async function uploadDocument({ userId, type, expiryDate, fileUrl, status }) {
  if (!userId) {
    throw new Error('userId is required.')
  }
  if (!type) {
    throw new Error('type is required.')
  }
  if (!expiryDate) {
    throw new Error('expiryDate is required.')
  }

  try {
    const docRef = await addDoc(collection(db, 'documents'), {
      userId,
      type,
      expiryDate,
      fileUrl: fileUrl || null,
      status: status || 'Valid',
      uploadedAt: serverTimestamp(),
    })
    return { id: docRef.id, type, status: status || 'Valid' }
  } catch (err) {
    console.error('uploadDocument service error:', err)
    throw err
  }
}

export async function updateDocumentStatus({ docId, status }) {
  if (!docId) {
    throw new Error('docId is required.')
  }
  if (!status) {
    throw new Error('status is required.')
  }

  try {
    const docRef = doc(db, 'documents', docId)
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    })
    return { id: docId, status }
  } catch (err) {
    console.error('updateDocumentStatus service error:', err)
    throw err
  }
}
