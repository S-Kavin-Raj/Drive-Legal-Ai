import { apiClient } from './apiClient'

export async function fetchNotifications(userId) {
  try {
    const response = await apiClient.get('/api/notifications', {
      params: { userId }
    })
    return response.data
  } catch (error) {
    console.error('fetchNotifications API error:', error)
    throw error
  }
}

export async function markAsRead(notificationId) {
  try {
    const response = await apiClient.post(`/api/notifications/${notificationId}/read`)
    return response.data
  } catch (error) {
    console.error('markAsRead API error:', error)
    throw error
  }
}

export async function markAllAsRead(userId) {
  try {
    const response = await apiClient.post('/api/notifications/mark-all-read', { userId })
    return response.data
  } catch (error) {
    console.error('markAllAsRead API error:', error)
    throw error
  }
}

export async function sweepNotifications(userId) {
  try {
    const response = await apiClient.post('/api/notifications/refresh-expiry', { userId })
    return response.data
  } catch (error) {
    console.error('sweepNotifications API error:', error)
    throw error
  }
}
