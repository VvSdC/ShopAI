const TOOL_STATUS_LABELS = {
  search_products: 'Searching products',
  get_product_details: 'Loading product details',
  get_similar_products: 'Finding similar products',
  get_categories: 'Browsing categories',
  get_brands: 'Browsing brands',
  get_cart: 'Checking your cart',
  add_to_cart: 'Adding to cart',
  update_cart_item: 'Updating cart',
  apply_coupon_to_cart: 'Applying coupon',
  remove_coupon_from_cart: 'Removing coupon',
  get_my_addresses: 'Loading addresses',
  add_shipping_address: 'Saving address',
  update_shipping_address: 'Updating address',
  preview_checkout: 'Preparing checkout',
  create_checkout_session: 'Creating payment session',
  get_active_coupons: 'Finding coupons',
  get_my_orders: 'Loading your orders',
  get_order_details: 'Loading order details',
  get_order_cancel_return_status: 'Checking order status',
  cancel_order: 'Cancelling order',
  submit_return_request: 'Submitting return request',
}

export function toolStatusLabel(toolName) {
  return TOOL_STATUS_LABELS[toolName] || `Running ${String(toolName || 'tool').replace(/_/g, ' ')}…`
}

export function writeSseEvent(res, type, data) {
  res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
  if (typeof res.flush === 'function') {
    res.flush()
  }
}

export function initSseResponse(res) {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders()
  }
}

export function mergeToolCallDeltas(accumulated, deltas) {
  for (const delta of deltas || []) {
    const index = delta.index ?? 0
    if (!accumulated[index]) {
      accumulated[index] = {
        id: '',
        type: 'function',
        function: { name: '', arguments: '' },
      }
    }
    const row = accumulated[index]
    if (delta.id) row.id = delta.id
    if (delta.type) row.type = delta.type
    if (delta.function?.name) {
      row.function.name += delta.function.name
    }
    if (delta.function?.arguments) {
      row.function.arguments += delta.function.arguments
    }
  }
}

export async function* parseOpenAiSseStream(response) {
  if (!response.body) {
    throw new Error('Streaming response has no body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        yield JSON.parse(payload)
      } catch {
        // ignore malformed chunks
      }
    }
  }
}
