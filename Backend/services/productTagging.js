import logger from '../utils/logger.js'
import { chatCompletion } from './llmService.js'
import Product from '../model/Product.js'
import { categoryDisplayName } from '../utils/categoryRef.js'
import { indexProductEmbeddingInBackground } from './search/vectorIndexService.js'

function buildTaggingPrompt(name, description, category, brand) {
  return `You are a product tagging system for an e-commerce platform. Given the product details below, extract 3-8 lowercase keyword tags that a customer might use to search for this product.

Tags should cover:
- Product type (e.g. "bat", "jersey", "saree", "shoes")
- Sport or activity (e.g. "cricket", "football", "yoga", "running")
- Occasion or use-case (e.g. "wedding", "casual", "office", "gym")
- Style or sub-category (e.g. "traditional", "modern", "ethnic", "western")
- Material if notable (e.g. "silk", "leather", "cotton")
- Any well-known association (e.g. "ipl", "mrf", "virat kohli")

Product name: "${name}"
Description: "${description}"
Category: "${category}"
Brand: "${brand}"

Respond with ONLY a JSON array of lowercase strings. No markdown, no explanation.
Example: ["cricket", "bat", "sports", "mrf", "virat kohli"]`
}

function parseTags(raw) {
  let text = raw.trim()

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) text = fenceMatch[1].trim()

  const bracketStart = text.indexOf('[')
  const bracketEnd = text.lastIndexOf(']')
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    text = text.slice(bracketStart, bracketEnd + 1)
  }

  const parsed = JSON.parse(text)

  if (!Array.isArray(parsed)) return []

  return parsed
    .filter((t) => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim().toLowerCase())
    .slice(0, 12)
}

export async function tagProduct(productId) {
  try {
    const product = await Product.findById(productId).populate('category', 'name')
    if (!product) return { ok: true, skipped: true }

    const messages = [
      {
        role: 'system',
        content: 'You are a product tagging system. Respond ONLY with a JSON array of strings. No markdown, no explanation.',
      },
      {
        role: 'user',
        content: buildTaggingPrompt(
          product.name,
          product.description,
          categoryDisplayName(product.category),
          product.brand
        ),
      },
    ]

    const response = await chatCompletion(messages, null)
    const content = response.choices?.[0]?.message?.content

    if (!content) return { ok: true, skipped: true }

    const tags = parseTags(content)
    if (tags.length > 0) {
      product.tags = tags
      await product.save()
    }

    return { ok: true, tagCount: tags.length }
  } catch (err) {
    logger.error(`Product tagging failed for ${productId}:`, err.message)
    throw err
  } finally {
    indexProductEmbeddingInBackground(productId, 500)
  }
}
