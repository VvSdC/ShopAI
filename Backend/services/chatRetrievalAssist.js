/** Deterministic product search fallback — runs when the agent skips search or invents catalog items. */
import { executeTool } from './chatTools.js'
import { buildCatalogBackedReply, looksLikeHallucinatedProductLinks, replyHasCatalogProductLinks } from './chatPostProcess.js'
import { isDiscoveryIntent } from './chatGraph/routerHeuristic.js'
import { isKitBundleQuery } from './chatGraph/productContext.js'

const SEARCH_ROUTES = new Set(['retrieval', 'comparison'])

const BROWSE_ALL_PATTERN =
  /^(?:no[,!\s]+)?(?:i\s+)?(?:want to|just)?\s*(?:check|see|show|view|browse|list)\s+(?:all|everything|all of them|them all|without filters?)\b/i

function inferProductQuery(text) {
  let t = String(text || '').trim()
  const stripPatterns = [
    /^(?:please\s+)?(?:can you\s+)?(?:help me\s+)?(?:i\s+)?(?:want to|would like to|need to)\s+(?:buy|purchase|get|find|search(?: for)?|show(?: me)?|see)\s+(?:a|an|some)?\s*/i,
    /^(?:show me|find me|looking for|search for)\s+(?:a|an|some)?\s*/i,
  ]
  for (const pattern of stripPatterns) {
    t = t.replace(pattern, '')
  }
  t = t.replace(/[?.!]+$/, '').trim()
  return t.length >= 2 ? t : null
}

function extractSearchQuery(userText, history = []) {
  const text = String(userText || '').trim()
  if (BROWSE_ALL_PATTERN.test(text)) {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i]
      if (msg?.role !== 'user') continue
      const prior = inferProductQuery(msg.content)
      if (prior) return prior
    }
    return null
  }
  return inferProductQuery(text)
}

function lastSearchFromToolResults(toolResults = []) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const row = toolResults[i]
    if (row?.toolName !== 'search_products' && !Array.isArray(row?.products)) continue
    if (row.error) return { error: row.error }
    if (Array.isArray(row.products)) {
      return {
        count: row.count ?? row.products.length,
        products: row.products,
        message: row.message,
      }
    }
  }
  return null
}

function searchWasUsed(toolsUsed = [], toolResults = []) {
  if (toolsUsed.includes('search_products')) return true
  return toolResults.some(
    (row) => row?.toolName === 'search_products' || Array.isArray(row?.products)
  )
}

function needsForcedSearch({ route, userText, history, toolsUsed, toolResults, reply }) {
  if (!SEARCH_ROUTES.has(route) && !isDiscoveryIntent(userText, history)) {
    return false
  }

  const prior = lastSearchFromToolResults(toolResults)
  if (prior?.error) return true
  if (looksLikeHallucinatedProductLinks(reply)) return true
  if (!searchWasUsed(toolsUsed, toolResults)) return true
  if (prior && prior.count === 0 && /\[View product\]/i.test(String(reply || ''))) return true
  return false
}

/**
 * @returns {Promise<{ toolResults: object[], reply: string|null }>}
 */
export async function runRetrievalAssist(
  userId,
  userText,
  history,
  toolResults,
  graphResult = {}
) {
  const route = graphResult.route || 'general'
  const reply = graphResult.reply || ''
  const toolsUsed = graphResult.toolsUsed || []

  if (!needsForcedSearch({ route, userText, history, toolsUsed, toolResults, reply })) {
    const prior = lastSearchFromToolResults(toolResults)
    if (
      prior?.products?.length &&
      !replyHasCatalogProductLinks(reply) &&
      !replyHasCatalogProductLinks(graphResult.reply)
    ) {
      return {
        toolResults,
        reply: buildCatalogBackedReply(prior, { kitQuery: isKitBundleQuery(userText) }),
      }
    }
    return { toolResults, reply: null }
  }

  const query = extractSearchQuery(userText, history)
  if (!query) {
    return { toolResults, reply: null }
  }

  const prior = lastSearchFromToolResults(toolResults)
  if (prior?.products?.length && looksLikeHallucinatedProductLinks(reply)) {
    return {
      toolResults,
      reply: buildCatalogBackedReply(prior, { kitQuery: isKitBundleQuery(userText) }),
    }
  }

  const result = await executeTool('search_products', userId, { query, limit: 8 })
  let mergedToolResults = [...toolResults, { ...result, toolName: 'search_products' }]

  if (result.error) {
    return {
      toolResults: mergedToolResults,
      reply:
        "I had trouble searching our catalog just now. Please try again in a moment, or browse products from the shop menu.",
    }
  }

  if ((result.count ?? 0) === 0) {
    const relaxedQuery = query
      .replace(/\b(under|below|over|above|less than|more than|upto|up to)\s*[₹]?\s*\d[\d,]*\b/gi, '')
      .replace(/\b(in|with|size|color|colour)\s+\w+\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (relaxedQuery.length >= 2 && relaxedQuery.toLowerCase() !== query.toLowerCase()) {
      const retry = await executeTool('search_products', userId, { query: relaxedQuery, limit: 8 })
      mergedToolResults = [...mergedToolResults, { ...retry, toolName: 'search_products' }]
      if ((retry.count ?? 0) > 0) {
        const reply = buildCatalogBackedReply(retry, { kitQuery: isKitBundleQuery(userText) })
        return {
          toolResults: mergedToolResults,
          reply: `No exact match for that filter, but here are close options:\n\n${reply}`,
        }
      }
    }

    const categories = await executeTool('get_categories', userId, {})
    mergedToolResults = [...mergedToolResults, { ...categories, toolName: 'get_categories' }]
    const names = (categories?.categories || [])
      .slice(0, 5)
      .map((c) => c.name)
      .filter(Boolean)
    const categoryHint = names.length
      ? `\n\nTry browsing: **${names.join('**, **')}** — or tell me what you're looking for in different words.`
      : '\n\nTry a shorter search term or browse from the shop menu.'

    return {
      toolResults: mergedToolResults,
      reply: `${result.message || "I couldn't find anything matching that in our catalog."}${categoryHint}`,
      suggestPrompts: true,
    }
  }

  return {
    toolResults: mergedToolResults,
    reply: buildCatalogBackedReply(result, { kitQuery: isKitBundleQuery(userText) }),
  }
}

export { inferProductQuery, extractSearchQuery }
