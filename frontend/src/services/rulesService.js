import { apiClient } from './apiClient'

export async function searchTrafficRules(queryStr = '', category = '') {
  try {
    const res = await apiClient.get('/api/awareness/rules/search', {
      params: { q: queryStr, category }
    })
    return res.data?.rules || []
  } catch (err) {
    console.error('searchTrafficRules API error:', err)
    throw err
  }
}
