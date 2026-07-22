export function isSafeMarkdownHref(href) {
  if (!href || typeof href !== 'string') return false
  const value = href.trim()
  if (!value || value.startsWith('#')) return true
  if (value.startsWith('/')) return true
  try {
    const url = new URL(value, 'https://example.com')
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}
