/**
 * Deterministic comparison assist.
 *
 * Purpose: when the customer says "compare 1 and 2", "1 vs 3", or names two
 * products from the last listing, this module resolves those references to
 * catalog IDs and pre-fetches `get_product_details` for each of them so the
 * agent has grounded data to compare — instead of hallucinating specs or
 * having to run multiple tool rounds.
 *
 * Runs BEFORE the LangGraph agent (via a pre-hook) OR after the graph as a
 * safety net (via runDeterministicChatAssist). Here we implement the post-hook
 * variant so we don't need to refactor the graph.
 */
import { executeTool } from './chatTools.js'
import {
  activeCatalogProducts,
  parseListingNamesFromContent,
} from './chatGraph/productContext.js'

const ORDINAL_WORDS = {
  first: 1, '1st': 1, one: 1,
  second: 2, '2nd': 2, two: 2,
  third: 3, '3rd': 3, three: 3,
  fourth: 4, '4th': 4, four: 4,
  fifth: 5, '5th': 5, five: 5,
  sixth: 6, '6th': 6, six: 6,
  seventh: 7, '7th': 7, seven: 7,
  eighth: 8, '8th': 8, eight: 8,
}

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i

const COMPARE_TRIGGER =
  /\b(compare|vs\.?|versus|difference|better(?: than)?|which(?: one)?(?: is)?(?: better)?)\b/i

function normalizeText(text) {
  return String(text || '').trim().toLowerCase()
}

/**
 * Extract ordinal numbers referenced in the user text (e.g. "compare 1 and 3",
 * "the first vs the third one").
 */
export function extractOrdinalReferences(text) {
  const raw = normalizeText(text)
  if (!raw) return []
  const found = new Set()

  const numMatches = raw.match(/#?\s*(\d+)(?:st|nd|rd|th)?/g) || []
  for (const token of numMatches) {
    const n = parseInt(token.replace(/[^0-9]/g, ''), 10)
    if (Number.isFinite(n) && n >= 1 && n <= 20) found.add(n)
  }

  for (const [word, n] of Object.entries(ORDINAL_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i')
    if (re.test(raw)) found.add(n)
  }

  return Array.from(found).sort((a, b) => a - b)
}

/**
 * Extract product names the user typed by matching against known catalog
 * product names from history. Returns matched catalog entries in the order
 * they appear.
 */
export function extractNamedProductReferences(text, catalog) {
  const raw = normalizeText(text)
  if (!raw || !catalog?.length) return []

  const matches = []
  const seen = new Set()

  for (const entry of catalog) {
    const name = normalizeText(entry?.name)
    if (!name || name.length < 3) continue
    if (raw.includes(name)) {
      const key = String(entry.id || entry._id || name)
      if (!seen.has(key)) {
        seen.add(key)
        matches.push(entry)
      }
      continue
    }
    // Loose match: first two words of the product name
    const firstTwo = name.split(/\s+/).slice(0, 2).join(' ')
    if (firstTwo.length >= 6 && raw.includes(firstTwo)) {
      const key = String(entry.id || entry._id || name)
      if (!seen.has(key)) {
        seen.add(key)
        matches.push(entry)
      }
    }
  }

  return matches
}

/**
 * Resolve the products the user wants to compare. Returns up to 4 catalog
 * entries with valid Mongo IDs, sourced from ordinals and/or names.
 */
export function resolveComparisonTargets(userText, history) {
  const catalog = activeCatalogProducts(history)
  if (!catalog?.length) return []

  const ordinals = extractOrdinalReferences(userText)
  const named = extractNamedProductReferences(userText, catalog)

  const picked = []
  const seen = new Set()

  const push = (entry) => {
    const id = String(entry?.id || entry?._id || '')
    if (!OBJECT_ID_PATTERN.test(id)) return
    if (seen.has(id)) return
    seen.add(id)
    picked.push({ id, name: entry.name || null })
  }

  for (const idx of ordinals) {
    const entry = catalog[idx - 1]
    if (entry) push(entry)
    if (picked.length >= 4) break
  }
  for (const entry of named) {
    if (picked.length >= 4) break
    push(entry)
  }

  return picked
}

export function isCompareTrigger(userText) {
  return COMPARE_TRIGGER.test(String(userText || ''))
}

function detailAlreadyFetched(toolResults, productId) {
  return toolResults.some(
    (row) =>
      (row?.toolName === 'get_product_details' || (row?.id && row?.name && row?.description != null)) &&
      String(row?.id || row?._id) === String(productId) &&
      !row?.error
  )
}

/**
 * Fetch product details for each requested comparison target that we don't
 * already have. Returns extra tool results appended to the graph output.
 */
export async function runComparisonAssist(userId, userText, history, toolResults = [], options = {}) {
  const route = options.route
  if (route !== 'comparison' && !isCompareTrigger(userText)) {
    return { toolResults, reply: null }
  }

  const targets = resolveComparisonTargets(userText, history)
  if (targets.length < 2) {
    // Nothing deterministic to add — let the agent handle it (or the customer
    // is asking a general "which is better" question with no listing).
    return { toolResults, reply: null }
  }

  const newResults = []
  for (const target of targets) {
    if (detailAlreadyFetched(toolResults, target.id)) continue
    const result = await executeTool('get_product_details', userId, { product_id: target.id })
    newResults.push({ ...result, toolName: 'get_product_details' })
  }

  if (!newResults.length) {
    return { toolResults, reply: null }
  }

  return {
    toolResults: [...toolResults, ...newResults],
    reply: null,
  }
}

// Re-export helpers for tests.
export { parseListingNamesFromContent }
