const SEARCH_PRODUCT_FIELDS = [
  'id',
  'name',
  'brand',
  'category',
  'price',
  'inStock',
  'qtyLeft',
  'colors',
  'sizes',
  'productUrl',
]

const PRODUCT_BLOAT_KEYS = new Set([
  'embedding',
  'embeddedAt',
  'embeddingVersion',
  'embeddingModel',
  'searchDocument',
  'images',
  'image',
  'tags',
  '_id',
  '__v',
])

const DETAIL_DESCRIPTION_MAX = 320
const CART_DESCRIPTION_MAX = 160

function truncateText(text, maxLen) {
  const value = String(text || '').trim()
  if (!value || value.length <= maxLen) return value
  return `${value.slice(0, maxLen)}…`
}

function pickFields(source, fields) {
  const out = {}
  for (const key of fields) {
    if (source?.[key] !== undefined) out[key] = source[key]
  }
  return out
}

function stripProductBloat(product) {
  if (!product || typeof product !== 'object') return product
  const out = { ...product }
  for (const key of PRODUCT_BLOAT_KEYS) {
    delete out[key]
  }
  return out
}

export function compactSearchProduct(product) {
  return pickFields(stripProductBloat(product), SEARCH_PRODUCT_FIELDS)
}

export function compactProductDetail(product) {
  const lean = stripProductBloat(product)
  return {
    id: lean.id,
    name: lean.name,
    brand: lean.brand,
    category: lean.category,
    price: lean.price,
    inStock: lean.inStock,
    qtyLeft: lean.qtyLeft,
    colors: lean.colors,
    sizes: lean.sizes,
    productUrl: lean.productUrl,
    totalReviews: lean.totalReviews,
    description: truncateText(lean.description, DETAIL_DESCRIPTION_MAX),
  }
}

function compactCartItem(item) {
  if (!item || typeof item !== 'object') return item
  const { image, images, description, ...rest } = item
  return {
    ...rest,
    description: description ? truncateText(description, CART_DESCRIPTION_MAX) : description,
  }
}

export function compactCart(cart) {
  if (!cart || typeof cart !== 'object') return cart
  return {
    ...cart,
    items: (cart.items || []).map(compactCartItem),
  }
}

function compactCartToolResult(result) {
  if (!result || typeof result !== 'object') return result
  if (!result.cart) return result
  return { ...result, cart: compactCart(result.cart) }
}

const CART_TOOLS = new Set([
  'get_cart',
  'add_to_cart',
  'update_cart_item',
  'apply_coupon_to_cart',
  'remove_coupon_from_cart',
])

export function compactToolResultForLlm(toolName, result) {
  if (result == null) return result
  if (typeof result !== 'object') return result
  if (result.error) return result

  switch (toolName) {
    case 'search_products':
      return {
        count: result.count,
        message: result.message,
        rule: result.rule,
        products: (result.products || []).map(compactSearchProduct),
      }
    case 'get_product_details':
      return compactProductDetail(result)
    case 'get_categories':
      if (Array.isArray(result)) {
        return result.map(({ name, productCount }) => ({ name, productCount }))
      }
      return result
    default:
      if (CART_TOOLS.has(toolName)) {
        return compactCartToolResult(result)
      }
      return result
  }
}

export function serializeToolResultForLlm(toolName, result) {
  return JSON.stringify(compactToolResultForLlm(toolName, result))
}
