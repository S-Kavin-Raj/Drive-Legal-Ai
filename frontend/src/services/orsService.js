import axios from 'axios'

export const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || ''

function buildOrsErrorMessage({ status, message, body }) {
  const parts = []
  if (status) parts.push(`ORS Error ${status}`)
  if (message) parts.push(String(message).trim())
  if (body) parts.push(`Response body: ${typeof body === 'string' ? body : JSON.stringify(body)}`)
  return parts.length > 0 ? parts.join(' — ') : 'OpenRouteService request failed.'
}

function logOrsFailure(context, err) {
  const status = err?.response?.status || err?.status || null
  const responseBody = err?.response?.data ?? err?.body ?? null
  const errorMessage = err?.response?.data?.error?.message || err?.response?.data?.error || err?.message || 'Unknown ORS error'

  console.error(`[${context}] ORS request failed`, {
    status,
    errorMessage,
    responseBody,
  })

  return buildOrsErrorMessage({
    status,
    message: errorMessage,
    body: responseBody,
  })
}

// 1. Fetch autocomplete place suggestions from OpenRouteService Geocoding API
export async function fetchPlaceSuggestions(query) {
  if (!query || query.trim().length < 3) return []
  
  if (!ORS_API_KEY) {
    console.error('VITE_ORS_API_KEY is missing.')
    return []
  }

  try {
    const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${encodeURIComponent(ORS_API_KEY)}&text=${encodeURIComponent(query)}&size=5&boundary.country=IN`
    const res = await axios.get(url)
    
    const features = res.data?.features || []
    return features.map((feature, idx) => ({
      id: feature.properties?.id || `ors-suggest-${idx}-${Date.now()}`,
      place_name: feature.properties?.label || feature.properties?.name || query,
      geometry: feature.geometry || { type: 'Point', coordinates: [0, 0] },
      place_type: [feature.properties?.layer || 'neighborhood'],
      properties: feature.properties || {},
    }))
  } catch (err) {
    logOrsFailure('ORS Geocoding API', err)
    return []
  }
}

// 2. Fetch coordinates for a specific place query
export async function fetchPlaceCoordinates(query) {
  if (!query || query.trim().length < 3) {
    throw new Error('A valid place query is required.')
  }

  if (!ORS_API_KEY) {
    throw new Error('OpenRouteService API key (VITE_ORS_API_KEY) is missing.')
  }

  try {
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(ORS_API_KEY)}&text=${encodeURIComponent(query)}&size=1&boundary.country=IN`
    const res = await axios.get(url)
    
    const feature = res.data?.features?.[0]
    if (!feature?.geometry?.coordinates || feature.geometry.coordinates.length !== 2) {
      throw new Error(`Unable to geocode location: ${query}`)
    }

    return {
      name: feature.properties?.label || feature.properties?.name || query,
      coordinates: feature.geometry.coordinates, // [longitude, latitude]
      placeType: feature.properties?.layer || 'city',
      raw: feature,
    }
  } catch (err) {
    const formattedMessage = logOrsFailure('ORS Geocoding Coordinates API', err)
    throw new Error(formattedMessage)
  }
}
