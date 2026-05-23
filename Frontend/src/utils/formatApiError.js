/**
 * Turn API error payloads into a string for alerts / inline messages.
 */
export default function formatApiError(error) {
  if (!error) return 'Something went wrong. Please try again.'
  if (typeof error === 'string') return error

  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors
      .map((item) => {
        if (typeof item === 'string') return item
        if (item?.field && item?.message) return `${item.field}: ${item.message}`
        return item?.message || String(item)
      })
      .join('\n')
  }

  if (error.message) return error.message

  return 'Something went wrong. Please try again.'
}
