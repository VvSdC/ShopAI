export function formatInr(price) {
  return `₹${Number(price || 0).toLocaleString('en-IN')}`
}

export function stockBadge(qtyLeft, inStock = true) {
  if (qtyLeft != null && qtyLeft <= 0) {
    return { label: 'Out of stock', className: 'bg-red-50 text-red-700 ring-red-200' }
  }
  if (qtyLeft != null && qtyLeft <= 5) {
    return { label: `${qtyLeft} left`, className: 'bg-amber-50 text-amber-800 ring-amber-200' }
  }
  if (qtyLeft != null) {
    return { label: `${qtyLeft} in stock`, className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' }
  }
  if (!inStock) {
    return { label: 'Out of stock', className: 'bg-red-50 text-red-700 ring-red-200' }
  }
  return { label: 'In stock', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' }
}
