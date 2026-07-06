import axiosInstance from './axiosInstance'

/**
 * Keyword-only product suggestions for search typeahead.
 * @param {string} query
 * @param {{ category?: string, limit?: number, signal?: AbortSignal }} [options]
 */
export async function fetchProductSuggestions(query, options = {}) {
  const trimmed = String(query || '').trim()
  if (trimmed.length < 2) return []

  const params = { q: trimmed, limit: options.limit || 6 }
  if (options.category) params.category = options.category

  const { data } = await axiosInstance.get('/products/suggestions', {
    params,
    signal: options.signal,
  })

  return data?.suggestions || []
}
