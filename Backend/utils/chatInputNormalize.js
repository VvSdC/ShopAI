/** Lightweight typo / slang normalization for chat intent heuristics. */

const TYPO_REPLACEMENTS = [
  [/\bchekout\b/gi, 'checkout'],
  [/\bcheckot\b/gi, 'checkout'],
  [/\bchecout\b/gi, 'checkout'],
  [/\bchek\s*out\b/gi, 'checkout'],
  [/\bcncl\b/gi, 'cancel'],
  [/\bcancle\b/gi, 'cancel'],
  [/\bordr\b/gi, 'order'],
  [/\bordrs\b/gi, 'orders'],
  [/\bdiscnt\b/gi, 'discount'],
  [/\bdscount\b/gi, 'discount'],
  [/\bshrt\b/gi, 'shirt'],
  [/\bshrts\b/gi, 'shirts'],
  [/\btshrt\b/gi, 'tshirt'],
  [/\bt\s*shirt\b/gi, 'tshirt'],
  [/\bshoos\b/gi, 'shoes'],
  [/\bjeens\b/gi, 'jeans'],
  [/\bproceedd\b/gi, 'proceed'],
  [/\bproced\b/gi, 'proceed'],
  [/\baddres\b/gi, 'address'],
  [/\badrss\b/gi, 'address'],
  [/\bphon\b/gi, 'phone'],
  [/\bphne\b/gi, 'phone'],
  [/\bcartt\b/gi, 'cart'],
  [/\bwishlst\b/gi, 'wishlist'],
  [/\btrackng\b/gi, 'tracking'],
  [/\bshippng\b/gi, 'shipping'],
  [/\bcouponn\b/gi, 'coupon'],
]

function collapseRepeatedLetters(text) {
  return String(text || '').replace(/\b([a-z]{2,20})\b/gi, (word) =>
    word.replace(/(.)\1{2,}/gi, '$1$1')
  )
}

/**
 * Normalize casual/typo input before regex heuristics. Does not alter the
 * original message sent to the LLM — only the routing fast-path.
 */
export function normalizeChatInput(text) {
  let t = String(text || '').trim()
  if (!t) return t
  t = collapseRepeatedLetters(t)
  for (const [pattern, replacement] of TYPO_REPLACEMENTS) {
    t = t.replace(pattern, replacement)
  }
  return t
}
