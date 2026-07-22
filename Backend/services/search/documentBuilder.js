import { categoryDisplayName } from '../../utils/categoryRef.js'
import { brandDisplayName } from '../../utils/brandRef.js'

export function buildProductSearchDocument(product) {
  const tags = Array.isArray(product.tags) ? product.tags.join(', ') : ''
  const colors = Array.isArray(product.colors) ? product.colors.join(', ') : ''
  const sizes = Array.isArray(product.sizes) ? product.sizes.join(', ') : ''
  const qtyLeft = (product.totalQty ?? 0) - (product.totalSold ?? 0)

  const type = product.sizeMeasurementType ?? 'apparel'
  const label = (product.sizeLabel || '').trim()
  const sizeLine =
    type === 'none'
      ? 'No size selection required'
      : sizes
        ? `Sizes (${label || 'Size'}): ${sizes}`
        : ''

  return [
    product.name,
    `Brand: ${brandDisplayName(product.brand)}`,
    `Category: ${categoryDisplayName(product.category)}`,
    product.description || '',
    tags ? `Tags: ${tags}` : '',
    colors ? `Colors: ${colors}` : '',
    sizeLine,
    `Price: INR ${product.price ?? 0}`,
    qtyLeft > 0 ? 'In stock' : 'Out of stock',
  ]
    .filter(Boolean)
    .join('. ')
}
