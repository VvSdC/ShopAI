import { resolveOptionMatch } from './cartService.js'
import { productRequiresSizeSelection } from '../utils/normalizeProductSizes.js'

const COLOR_HINTS = [
  { patterns: [/\bred\b/i, /\bcloser to red\b/i, /\bmaroon\b/i, /\bcherry\b/i], prefer: ['cherry', 'red', 'maroon'] },
  { patterns: [/\bpink\b/i, /\blight pink\b/i], prefer: ['light pink', 'pink'] },
  { patterns: [/\bwhite\b/i], prefer: ['white'] },
  { patterns: [/\bblue\b/i, /\bnavy\b/i], prefer: ['navy', 'blue'] },
  { patterns: [/\bblack\b/i], prefer: ['black'] },
  { patterns: [/\bgreen\b/i], prefer: ['green'] },
  { patterns: [/\bwood(en)?\b/i, /\bwillow\b/i, /\benglish willow\b/i], prefer: ['wooden', 'wood', 'english willow'] },
]

export function isBallLikeProduct(name) {
  return /\b(ball|shuttle|shuttlecock)\b/i.test(String(name || ''))
}

export function isBatLikeProduct(name) {
  return /\b(bat)\b/i.test(String(name || '')) && !isBallLikeProduct(name)
}

/** @deprecated Prefer product.sizeMeasurementType on the product document. */
export function productUsesApparelSizes(productOrName) {
  if (productOrName && typeof productOrName === 'object') {
    return productRequiresSizeSelection(productOrName)
  }
  if (isBallLikeProduct(productOrName)) return false
  return true
}

export function resolveColorForProduct(requestedColor, availableColors, userText = '') {
  const colors = availableColors || []
  if (!colors.length) return null

  const direct = resolveOptionMatch(requestedColor, colors)
  if (direct) return direct

  const text = `${requestedColor || ''} ${userText || ''}`.trim()
  if (!text) return colors.length === 1 ? colors[0] : null

  for (const hint of COLOR_HINTS) {
    if (!hint.patterns.some((p) => p.test(text))) continue
    for (const prefer of hint.prefer) {
      const match = resolveOptionMatch(prefer, colors)
      if (match) return match
    }
  }

  for (const color of colors) {
    const c = color.toLowerCase()
    if (/\bred\b/i.test(text) && (c.includes('red') || c.includes('cherry'))) {
      return color
    }
  }

  return colors.length === 1 ? colors[0] : null
}

export function resolveSizeForProduct(requestedSize, availableSizesOrProduct, productName, userText = '') {
  const product =
    availableSizesOrProduct &&
    typeof availableSizesOrProduct === 'object' &&
    !Array.isArray(availableSizesOrProduct)
      ? availableSizesOrProduct
      : null
  const sizes = product?.sizes ?? (Array.isArray(availableSizesOrProduct) ? availableSizesOrProduct : [])
  const name = product?.name ?? productName ?? ''
  const type = product?.sizeMeasurementType ?? 'apparel'

  if (type === 'none' || !sizes.length) return 'One Size'

  if (type !== 'apparel') {
    if (requestedSize) {
      const match = resolveOptionMatch(requestedSize, sizes)
      if (match) return match
    }
    return sizes.length === 1 ? sizes[0] : null
  }

  if (isBallLikeProduct(name)) {
    if (requestedSize) {
      const match = resolveOptionMatch(requestedSize, sizes)
      if (match) return match
    }
    return sizes[0]
  }

  const direct = resolveOptionMatch(requestedSize, sizes)
  if (direct) return direct

  const text = `${requestedSize || ''} ${userText || ''}`.toLowerCase()
  if (/\b(extra extra large|double extra large|double xl|xxl)\b/.test(text)) {
    return resolveOptionMatch('XXL', sizes) || resolveOptionMatch('xxl', sizes)
  }
  if (/\b(extra large|x-large|xlarge|\bxl\b)\b/.test(text)) {
    return resolveOptionMatch('XL', sizes) || resolveOptionMatch('xl', sizes)
  }
  if (/\b(large|\bl\b)\b/.test(text) && !/\bxl\b/.test(text)) {
    return resolveOptionMatch('L', sizes)
  }
  if (/\b(medium|\bm\b)\b/.test(text)) {
    return resolveOptionMatch('M', sizes)
  }
  if (/\b(small|\bs\b)\b/.test(text)) {
    return resolveOptionMatch('S', sizes)
  }

  return sizes.length === 1 ? sizes[0] : null
}

export function listMissingVariantFields(product) {
  const missing = []
  const colors = product.colors || []

  if (colors.length > 1) missing.push('color')
  if (productRequiresSizeSelection(product)) missing.push('size')
  return missing
}
