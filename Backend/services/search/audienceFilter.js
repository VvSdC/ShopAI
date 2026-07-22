/**
 * Query-derived audience / gender filter.
 *
 * The Product schema has no explicit `gender` / `section` field today, so we
 * infer audience from the query and match it against product `tags`,
 * `category` name, product `name`, and `description`. Applied AFTER search /
 * rerank as a strict post-filter so an obviously men's query never returns
 * a women's product (and vice versa).
 *
 * NOTE: a proper long-term fix is to add `Product.audience` (or `section`)
 * with enum ["men","women","kids","unisex"] and index it. Until then, this
 * pragmatic filter closes the biggest hallucination gap.
 */

const AUDIENCE_KEYWORDS = {
  men: [
    /\b(mens?|men'?s|for men|male|boys?|boys'|gents?|gentlemen)\b/i,
  ],
  women: [
    /\b(women'?s?|womens|for women|ladies|ladies'|girls?|girls'|female|feminine)\b/i,
  ],
  kids: [
    /\b(kids?|kids'|children'?s?|toddlers?|infants?|baby|babies|junior)\b/i,
  ],
}

const AUDIENCE_TAG_SIGNALS = {
  men: ['men', 'mens', 'male', 'gents', 'boys', 'boy'],
  women: ['women', 'womens', 'ladies', 'female', 'girls', 'girl'],
  kids: ['kids', 'children', 'child', 'toddler', 'infant', 'baby', 'junior', 'youth'],
}

const AUDIENCE_CONFLICTS = {
  men: ['women', 'ladies', 'female', 'girls', 'girl', 'womens'],
  women: ['men', 'male', 'gents', 'boys', 'boy', 'mens'],
  kids: [],
}

const UNISEX_HINTS = ['unisex', 'all', 'universal']

/**
 * Detect audience from a raw query string. Returns 'men' | 'women' | 'kids' | null.
 * `null` means "no explicit audience filter" — do not restrict results.
 */
export function detectAudienceFromQuery(query) {
  const text = String(query || '').toLowerCase()
  if (!text.trim()) return null

  for (const [audience, patterns] of Object.entries(AUDIENCE_KEYWORDS)) {
    if (patterns.some((p) => p.test(text))) return audience
  }
  return null
}

function productHasSignal(product, signals) {
  if (!signals?.length) return false
  const tags = (product.tags || []).map((t) => String(t).toLowerCase())
  const name = String(product.name || '').toLowerCase()
  const description = String(product.description || '').toLowerCase()
  const category =
    typeof product.category === 'string'
      ? product.category.toLowerCase()
      : String(product.category?.name || '').toLowerCase()

  return signals.some(
    (signal) =>
      tags.includes(signal) ||
      new RegExp(`\\b${signal}\\b`, 'i').test(name) ||
      new RegExp(`\\b${signal}\\b`, 'i').test(category) ||
      new RegExp(`\\b${signal}\\b`, 'i').test(description)
  )
}

function productHasUnisexHint(product) {
  return productHasSignal(product, UNISEX_HINTS)
}

/**
 * Score a product's fit for a target audience.
 *   1 — explicit match
 *   0 — unknown (keep)
 *  -1 — explicit conflict (drop)
 */
export function scoreAudienceFit(product, audience) {
  if (!audience) return 0

  const matchSignals = AUDIENCE_TAG_SIGNALS[audience] || []
  const conflictSignals = AUDIENCE_CONFLICTS[audience] || []

  const matches = productHasSignal(product, matchSignals)
  if (matches) return 1

  const conflicts = productHasSignal(product, conflictSignals)
  if (conflicts && !productHasUnisexHint(product)) return -1

  return 0
}

/**
 * Filter a product list to those that match the requested audience.
 * Behaviour:
 *   - No audience → returns list unchanged.
 *   - Some explicit matches exist → drop conflicts, prefer explicit matches.
 *   - No explicit matches and no conflicts → keep list as-is (unknown ≠ mismatch).
 */
export function applyAudienceFilter(products, audience) {
  if (!audience || !Array.isArray(products) || products.length === 0) return products

  const scored = products.map((p) => ({ product: p, fit: scoreAudienceFit(p, audience) }))
  const anyExplicitMatch = scored.some((r) => r.fit === 1)

  if (anyExplicitMatch) {
    return scored.filter((r) => r.fit >= 0).map((r) => r.product)
  }
  // No product explicitly declares audience — keep list minus explicit conflicts.
  return scored.filter((r) => r.fit >= 0).map((r) => r.product)
}
