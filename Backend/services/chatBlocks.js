/**
 * Structured UI blocks for chat responses — rendered as cards/chips on the frontend
 * instead of relying on markdown alone.
 */
import { productRequiresSizeSelection } from '../utils/normalizeProductSizes.js'
import { hasSignInRequiredResult } from './guestChatRestrictions.js'

const DEFAULT_SUGGESTED_PROMPTS = [
  { label: 'Find a cricket ball', message: 'Find a cricket ball' },
  { label: 'Show my orders', message: 'Show my recent orders' },
  { label: 'What is in my cart?', message: 'What is in my cart?' },
  { label: 'Any coupons?', message: 'Any active coupon codes?' },
]

function findDisambiguationInToolResults(toolResults = []) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const row = toolResults[i]
    if (row?.toolName === 'product_disambiguation' && row.products?.length) {
      return row.products
    }
  }
  return null
}

function searchReturnedEmpty(toolResults = []) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const row = toolResults[i]
    if (row?.toolName === 'search_products' && row.count === 0) return true
  }
  return false
}

function suggestedPromptsBlock(prompts = DEFAULT_SUGGESTED_PROMPTS) {
  return {
    type: 'suggested_prompts',
    prompts,
  }
}

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i
const ORDINAL_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
const ORDINAL_MESSAGES = [
  'the first one',
  'the second one',
  'the third one',
  'the fourth one',
  'the fifth one',
  'the sixth one',
  'the seventh one',
  'the eighth one',
]
const DETAIL_DESC_MAX = 180

function findSearchInToolResults(toolResults = []) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const row = toolResults[i]
    if (row?.toolName !== 'search_products' && row?.toolName !== 'get_similar_products' && !Array.isArray(row?.products)) continue
    if (row.error) continue
    if (Array.isArray(row.products) && row.products.length) {
      return {
        count: row.count ?? row.products.length,
        products: row.products,
      }
    }
  }
  return null
}

function findDetailInToolResults(toolResults = []) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const row = toolResults[i]
    if (row?.error) continue
    if (row?.toolName === 'get_product_details' || (row?.id && row?.name && row?.description != null)) {
      if (row.id && row.name) return row
    }
  }
  return null
}

function collectDetailToolResults(toolResults = []) {
  const rows = []
  const seen = new Set()
  for (const row of toolResults) {
    if (row?.error) continue
    if (row?.toolName !== 'get_product_details' && !(row?.id && row?.name && row?.description != null)) {
      continue
    }
    const id = String(row?.id || row?._id || '')
    if (!OBJECT_ID_RE.test(id) || seen.has(id)) continue
    seen.add(id)
    rows.push(row)
  }
  return rows
}

function pickImage(images) {
  if (!Array.isArray(images)) return null
  const url = images.find(Boolean)
  return url ? String(url) : null
}

function truncateText(text, max = DETAIL_DESC_MAX) {
  const trimmed = String(text || '').trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trim()}…`
}

function formatSizeSummary(product) {
  if (product.sizeMeasurementType === 'none') return null
  const sizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : []
  if (!sizes.length) return 'One size'
  if (sizes.length <= 4) return sizes.join(', ')
  const nums = sizes.map((s) => parseInt(String(s), 10)).filter(Number.isFinite)
  if (nums.length === sizes.length && nums.length > 4) {
    return `${Math.min(...nums)}–${Math.max(...nums)}`
  }
  return `${sizes[0]}–${sizes[sizes.length - 1]}`
}

export function normalizeListingProduct(p) {
  const id = String(p.id || p._id || '')
  return {
    id,
    name: String(p.name || '').trim(),
    price: Number(p.price) || 0,
    image: p.image || pickImage(p.images) || null,
    productUrl: p.productUrl || `/products/${id}`,
    qtyLeft: p.qtyLeft != null ? Number(p.qtyLeft) : null,
    inStock: p.inStock !== false,
    brand: p.brand ? String(p.brand) : null,
    category: p.category ? String(p.category) : null,
  }
}

export function normalizeDetailProduct(p) {
  const base = normalizeListingProduct(p)
  return {
    ...base,
    description: truncateText(p.description),
    brand: p.brand ? String(p.brand) : null,
    category: p.category ? String(p.category) : null,
    colors: Array.isArray(p.colors) ? p.colors.map(String) : [],
    sizes: Array.isArray(p.sizes) ? p.sizes.map(String) : [],
    sizeSummary: formatSizeSummary(p),
    sizeLabel: p.sizeLabel ? String(p.sizeLabel) : 'Size',
    sizeMeasurementType: p.sizeMeasurementType || 'apparel',
    needsSize: productRequiresSizeSelection(p),
    totalReviews: p.totalReviews != null ? Number(p.totalReviews) : null,
  }
}

function findLastCartInToolResults(toolResults = []) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const cart = toolResults[i]?.cart
    if (cart?.items?.length) return cart
  }
  return null
}

function findLastAddressesInToolResults(toolResults = []) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const row = toolResults[i]
    if (Array.isArray(row?.addresses) && row.addresses.length) {
      return row.addresses
    }
  }
  return null
}

function quickActionsBlock(actions, extra = {}) {
  const filtered = (actions || []).filter((a) => a?.label && a?.message)
  if (!filtered.length && !extra.quantityInput) return null
  return { type: 'quick_actions', actions: filtered.slice(0, 8), ...extra }
}

export function buildListingQuickActions(products = []) {
  const actions = products.slice(0, 8).map((p, i) => ({
    label: ORDINAL_LABELS[i] || String(i + 1),
    message: ORDINAL_MESSAGES[i] || `number ${i + 1}`,
  }))
  return quickActionsBlock(actions)
}

export function buildDetailQuickActions(product) {
  const actions = [{ label: 'Add 1', message: 'add 1 to cart' }]
  if (productNeedsSize(product)) {
    const sizes = Array.isArray(product.sizes) ? product.sizes : []
    const picks = sizes.length <= 5 ? sizes : sizes.filter((_, i) => i === 0 || i === Math.floor(sizes.length / 2) || i === sizes.length - 1)
    for (const size of picks.slice(0, 3)) {
      actions.push({ label: `Size ${size}`, message: `add 1 size ${size}` })
    }
  } else {
    actions.push({ label: 'Add 2', message: 'add 2 to cart' })
  }
  return quickActionsBlock(actions, { quantityInput: true })
}

function productNeedsSize(product) {
  return productRequiresSizeSelection(product)
}

export function buildAddressQuickActions(addresses = []) {
  const actions = addresses.slice(0, 4).map((a) => ({
    label: String(a.choiceNumber ?? addresses.indexOf(a) + 1),
    message: String(a.choiceNumber ?? addresses.indexOf(a) + 1),
  }))
  actions.push({
    label: 'New address',
    message: 'I want to add a new shipping address',
    variant: 'outline',
  })
  return quickActionsBlock(actions)
}

export function normalizeCartBlock(cart) {
  return {
    itemCount: cart.itemCount ?? cart.totalUnits ?? 0,
    total: cart.total ?? 0,
    subtotal: cart.subtotal ?? cart.total ?? 0,
    discountAmount: cart.discountAmount ?? 0,
    items: (cart.items || []).map((item) => ({
      id: String(item._id || item.id || ''),
      name: String(item.name || ''),
      qty: Number(item.qty) || 1,
      size: item.size ? String(item.size) : null,
      color: item.color ? String(item.color) : null,
      price: Number(item.price) || 0,
      totalPrice: Number(item.totalPrice) || 0,
      image: item.image || null,
    })),
  }
}

/**
 * @returns {object[]} UI blocks for the chat client
 */
export function buildChatBlocks({
  toolResults = [],
  messageKind = null,
  pendingQuery = null,
  suggestPrompts = false,
} = {}) {
  const blocks = []

  if (messageKind === 'sign_in_required' || hasSignInRequiredResult(toolResults)) {
    blocks.push({
      type: 'sign_in_required',
      pendingQuery: pendingQuery || null,
    })
    return blocks
  }

  const disambiguation = findDisambiguationInToolResults(toolResults)
  const catalog = findSearchInToolResults(toolResults)
  const similarListing = catalog?.products?.length &&
    toolResults.some((row) => row?.toolName === 'get_similar_products')

  if (disambiguation?.length) {
    const products = disambiguation.map(normalizeListingProduct)
    blocks.push({ type: 'product_listing', products })
    const qa = buildListingQuickActions(products)
    if (qa) blocks.push(qa)
  } else if (
    catalog?.products?.length &&
    catalog.products.every((p) => OBJECT_ID_RE.test(String(p.id || p._id || ''))) &&
    (messageKind === 'product_listing' || similarListing)
  ) {
    const products = catalog.products.map(normalizeListingProduct)
    blocks.push({ type: 'product_listing', products })
    const qa = buildListingQuickActions(products)
    if (qa) blocks.push(qa)
  }

  const detail = findDetailInToolResults(toolResults)
  if (messageKind === 'product_detail' && detail?.id && OBJECT_ID_RE.test(String(detail.id))) {
    const product = normalizeDetailProduct(detail)
    blocks.push({ type: 'product_detail', product })
    const qa = buildDetailQuickActions(detail)
    if (qa) blocks.push(qa)
  }

  if (messageKind === 'product_comparison') {
    const detailRows = collectDetailToolResults(toolResults)
    if (detailRows.length >= 2) {
      const products = detailRows.slice(0, 4).map(normalizeDetailProduct)
      blocks.push({ type: 'product_comparison', products })
    }
  }

  const cart = findLastCartInToolResults(toolResults)
  if (
    (messageKind === 'cart_confirm' || messageKind === 'cart_summary') &&
    cart?.items?.length
  ) {
    blocks.push({ type: 'cart_summary', cart: normalizeCartBlock(cart) })
    const qa = quickActionsBlock([
      { label: 'Checkout', message: 'proceed to checkout' },
      { label: 'View cart', message: 'what is in my cart' },
    ])
    if (qa) blocks.push(qa)
  }

  const addresses = findLastAddressesInToolResults(toolResults)
  if (messageKind === 'address_picker' && addresses?.length) {
    blocks.push({
      type: 'address_picker',
      addresses: addresses.map((a) => ({
        choiceNumber: a.choiceNumber ?? null,
        label: a.label || `${a.city}, ${a.province}`,
        city: a.city || '',
        province: a.province || '',
        address: a.address || '',
        postalCode: a.postalCode || '',
        name: a.name || null,
      })),
    })
    const qa = buildAddressQuickActions(addresses)
    if (qa) blocks.push(qa)
  }

  if (suggestPrompts || searchReturnedEmpty(toolResults)) {
    blocks.push(suggestedPromptsBlock())
  }

  return blocks
}
