import { apiClient } from './apiClient'

export async function parseChallanOCR(formData) {
  try {
    const res = await apiClient.post('/api/challan-ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  } catch (err) {
    console.error('parseChallanOCR API error:', err)
    throw err
  }
}
