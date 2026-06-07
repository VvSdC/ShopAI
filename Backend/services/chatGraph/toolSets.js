import { toolDefinitions } from '../chatTools.js'

export const ROUTE_TOOL_NAMES = {
  retrieval: ['search_products', 'get_product_details', 'get_categories', 'get_brands'],
  product_detail: ['get_product_details', 'search_products'],
  comparison: ['search_products', 'get_product_details', 'get_categories', 'get_brands'],
  payment: ['get_my_orders', 'get_order_details'],
  order_summary: ['get_my_orders', 'get_order_details'],
  order_update: [
    'get_my_orders',
    'get_order_details',
    'get_order_cancel_return_status',
    'cancel_order',
    'submit_return_request',
  ],
  checkout: [
    'search_products',
    'get_cart',
    'add_to_cart',
    'update_cart_item',
    'apply_coupon_to_cart',
    'remove_coupon_from_cart',
    'get_my_addresses',
    'add_shipping_address',
    'update_shipping_address',
    'preview_checkout',
    'create_checkout_session',
    'get_product_details',
    'get_active_coupons',
  ],
  policies: ['get_active_coupons'],
  general: ['search_products', 'get_cart', 'get_active_coupons', 'get_my_orders'],
}

export function getToolsForRoute(route) {
  const names = ROUTE_TOOL_NAMES[route] || ROUTE_TOOL_NAMES.general
  const allowed = new Set(names)
  return toolDefinitions.filter((def) => allowed.has(def.function.name))
}
