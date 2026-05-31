export function buildProductSearchDocument(product) {
  const tags = Array.isArray(product.tags) ? product.tags.join(', ') : ''
  const colors = Array.isArray(product.colors) ? product.colors.join(', ') : ''
  const sizes = Array.isArray(product.sizes) ? product.sizes.join(', ') : ''
  const qtyLeft = (product.totalQty ?? 0) - (product.totalSold ?? 0)

  return [
    product.name,
    `Brand: ${product.brand || ''}`,
    `Category: ${product.category || ''}`,
    product.description || '',
    tags ? `Tags: ${tags}` : '',
    colors ? `Colors: ${colors}` : '',
    sizes ? `Sizes: ${sizes}` : '',
    `Price: INR ${product.price ?? 0}`,
    qtyLeft > 0 ? 'In stock' : 'Out of stock',
  ]
    .filter(Boolean)
    .join('. ')
}
