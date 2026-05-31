import { apiClient } from './apiClient'

export async function sendChatMessage(question) {
  try {
    const response = await apiClient.post('/api/awareness/chat', { question })
    return response.data
  } catch (error) {
    console.error('sendChatMessage API error:', error)
    throw error
  }
}
