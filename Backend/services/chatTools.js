import Order from '../model/Order.js'
import Product from '../model/Product.js'
import Category from '../model/Category.js'
import Brand from '../model/Brand.js'
import Coupon from '../model/Coupon.js'
import User from '../model/User.js'
import { isCouponLive } from '../utils/couponDates.js'
import {
  getCart,
  addItem,
  updateItemQty,
  applyCoupon,
  removeCoupon,
  resolveOptionMatch,
} from './cartService.js'
import {
  previewCheckout,
  checkoutFromCart,
} from './checkoutFromCart.js'
import {
  buildProductSearchFilter,
  rankProductsByQuery,
  mapProductSearchResult,
} from './productSearch.js'
import {
  listShippingAddresses,
  addShippingAddress,
  updateShippingAddress,
} from './addressService.js'
import {
  getOrderCancelReturnStatus,
  cancelOrderByReference,
  submitReturnByReference,
  resolveOrderForUser,
} from './orderActionsService.js'

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_my_orders',
      description:
        "Fetch the current user's recent orders including status, payment info, items, and totals. Use when the user asks about their orders, order history, or purchases.",
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of recent orders to return (default 5, max 10)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_details',
      description:
        'Get full details of a specific order by its order number or ID. Use when user asks about a particular order.',
      parameters: {
        type: 'object',
        properties: {
          order_number: {
            type: 'string',
            description: 'The order number (e.g. "ABC12345")',
          },
          order_id: {
            type: 'string',
            description: 'The order MongoDB ID',
          },
        },
      },
      required: [],
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_products',
      description:
        'Search the ShopAI product catalog (database only). ALWAYS use this before naming any product, price, or stock. Use "query" first — searches name, description, category, brand, and tags. Only add category/brand if you know exact values from get_categories/get_brands. You may ONLY describe products returned by this tool — never invent items.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term — matched against product name AND description. Use this as the primary search parameter.',
          },
          category: {
            type: 'string',
            description: 'EXACT category name to filter by (get exact names from get_categories first)',
          },
          brand: {
            type: 'string',
            description: 'EXACT brand name to filter by (get exact names from get_brands first)',
          },
          color: {
            type: 'string',
            description: 'Filter by color',
          },
          min_price: {
            type: 'number',
            description: 'Minimum price in INR',
          },
          max_price: {
            type: 'number',
            description: 'Maximum price in INR',
          },
          limit: {
            type: 'number',
            description: 'Max results to return (default 8, max 15)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product_details',
      description:
        'Get detailed information about a specific product including description, sizes, colors, price, and stock.',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'The product ID',
          },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_categories',
      description:
        'List all available product categories. Use when user wants to browse or asks what categories are available.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_brands',
      description: 'List all available brands.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_active_coupons',
      description:
        'Get currently active coupon codes with their discount percentages and expiry info. Use when user asks about discounts, promotions, or coupon codes.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_addresses',
      description:
        "Get the current user's saved shipping addresses with index numbers for checkout. Use when user asks about their addresses or delivery info.",
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_shipping_address',
      description:
        'Save a new shipping address to the user account. Use when the user provides delivery address details during checkout or asks to add an address. Parse city, state/province, and pincode from free-text when possible. Use profile name if first/last name not given.',
      parameters: {
        type: 'object',
        properties: {
          first_name: { type: 'string', description: 'First name' },
          last_name: { type: 'string', description: 'Last name' },
          address: { type: 'string', description: 'Street address line' },
          city: { type: 'string', description: 'City' },
          province: { type: 'string', description: 'State or province (e.g. Telangana)' },
          postal_code: { type: 'string', description: 'Postal / PIN code' },
          country: { type: 'string', description: 'Country code or name (default India/IN)' },
          phone: { type: 'string', description: 'Contact phone number' },
        },
        required: ['address', 'city', 'province', 'postal_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_shipping_address',
      description:
        'Update an existing saved shipping address by index (from get_my_addresses). Use when user wants to change their delivery address.',
      parameters: {
        type: 'object',
        properties: {
          address_index: {
            type: 'number',
            description: 'Zero-based index of the address to update',
          },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          postal_code: { type: 'string' },
          country: { type: 'string' },
          phone: { type: 'string' },
        },
        required: ['address_index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cart',
      description:
        "Get the current user's shopping cart with items, subtotal, coupon, and total. Use when user asks about their cart or before checkout.",
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_cart',
      description:
        'Add a product to the cart. Requires product_id, size, color, and qty. Call get_product_details first if size/color are unknown. If the same product+size+color is already in cart, this SETS the quantity (does not stack duplicates). Do NOT call again on checkout confirmation — use get_cart instead.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: 'Product MongoDB ID' },
          size: { type: 'string', description: 'Size e.g. M, L' },
          color: { type: 'string', description: 'Color name' },
          qty: { type: 'number', description: 'Quantity (default 1)' },
        },
        required: ['product_id', 'size', 'color'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_cart_item',
      description:
        'Update quantity of a cart line or remove it (qty 0). Identified by product_id, color, and size.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          color: { type: 'string' },
          size: { type: 'string' },
          qty: { type: 'number', description: 'New quantity; use 0 to remove' },
        },
        required: ['product_id', 'color', 'size', 'qty'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_coupon_to_cart',
      description:
        'Apply a coupon code to the server cart. Validates the code is live before applying.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Coupon code' },
        },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_coupon_from_cart',
      description: 'Remove the applied coupon from the cart.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'preview_checkout',
      description:
        'Preview checkout readiness: cart totals, shipping address, and missing requirements. Use before create_checkout_session.',
      parameters: {
        type: 'object',
        properties: {
          address_index: {
            type: 'number',
            description:
              'Index of saved shipping address (from get_my_addresses). Omit to use the most recently added address.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_checkout_session',
      description:
        'Create a Stripe checkout session from the server cart. Only after user explicitly confirms checkout and preview_checkout shows ready. Clears cart after order is created.',
      parameters: {
        type: 'object',
        properties: {
          address_index: {
            type: 'number',
            description:
              'Index of saved shipping address (from get_my_addresses). Omit to use the most recently added address.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_cancel_return_status',
      description:
        'Check whether an order can be cancelled (pending/processing) or returned (delivered within return window). Use when user wants to cancel, delete, or return an order. Returns availableAction: cancel | return | none.',
      parameters: {
        type: 'object',
        properties: {
          order_number: {
            type: 'string',
            description: 'Order number e.g. ABC12345',
          },
          order_id: { type: 'string', description: 'Order MongoDB ID' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_order',
      description:
        'Cancel an order before it ships (pending/processing only). If already cancelled, reports that. Refunds paid orders automatically. Get confirmation from user first unless they clearly asked to cancel.',
      parameters: {
        type: 'object',
        properties: {
          order_number: { type: 'string' },
          order_id: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'submit_return_request',
      description:
        'Submit a return request for a delivered order within the return window (3 days from delivery). Requires reason_code from returnReasons list. Default return_all=true returns all eligible items. Admin must approve before refund.',
      parameters: {
        type: 'object',
        properties: {
          order_number: { type: 'string' },
          order_id: { type: 'string' },
          reason_code: {
            type: 'string',
            description:
              'One of: wrong_item, damaged, size_fit, not_as_described, poor_quality, late_delivery, ordered_by_mistake, better_price, missing_parts, changed_mind, other',
          },
          reason_comment: {
            type: 'string',
            description: 'Required when reason_code is other',
          },
          return_all: {
            type: 'boolean',
            description: 'Return all eligible items (default true)',
          },
          items: {
            type: 'array',
            description: 'Optional partial return lines',
            items: {
              type: 'object',
              properties: {
                line_id: { type: 'string' },
                qty: { type: 'number' },
                reason_code: { type: 'string' },
                reason_comment: { type: 'string' },
              },
              required: ['line_id', 'qty'],
            },
          },
        },
        required: ['reason_code'],
      },
    },
  },
]

const toolExecutors = {
  async get_my_orders(userId, args) {
    const limit = Math.min(Math.max(args.limit || 5, 1), 10)
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)

    if (!orders.length) return { message: 'You have no orders yet.' }

    return orders.map((o) => ({
      orderId: String(o._id),
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalPrice: o.totalPrice,
      currency: o.currency || 'INR',
      itemCount: o.orderItems?.length || 0,
      items: o.orderItems?.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
      })),
      coupon: o.coupon || null,
      orderedOn: o.createdAt,
      deliveredAt: o.deliveredAt || null,
    }))
  },

  async get_order_details(userId, args) {
    let order = null
    if (args.order_id) {
      order = await Order.findOne({ _id: args.order_id, user: userId })
    } else if (args.order_number) {
      order = await Order.findOne({ orderNumber: args.order_number, user: userId })
    }

    if (!order) return { error: 'Order not found. Make sure the order number is correct.' }

    return {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalPrice: order.totalPrice,
      currency: order.currency || 'INR',
      coupon: order.coupon || null,
      deliveredAt: order.deliveredAt || null,
      items: order.orderItems?.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        size: i.size,
        color: i.color,
      })),
      shippingAddress: order.shippingAddress,
      orderedOn: order.createdAt,
    }
  },

  async search_products(_userId, args) {
    const filter = buildProductSearchFilter(args)
    const limit = Math.min(Math.max(args.limit || 8, 1), 15)
    const fetchLimit = Math.min(Math.max(limit * 4, 24), 50)

    const products = await Product.find(filter)
      .limit(fetchLimit)
      .select(
        'name brand category price totalQty totalSold colors sizes images description tags'
      )

    const ranked = rankProductsByQuery(products, args.query || '').slice(0, limit)

    if (!ranked.length) {
      return {
        count: 0,
        products: [],
        message: 'No products found in the catalog for this search.',
        rule: 'Tell the user nothing matched. Do NOT suggest or name products that were not returned here.',
      }
    }

    const mapped = ranked.map(mapProductSearchResult)

    return {
      count: mapped.length,
      products: mapped,
      rule:
        'List products in the EXACT order returned (most relevant first). Use EXACT names, prices, and stock. Include each productUrl as a markdown link: [View product](productUrl). Never add products not in this list.',
    }
  },

  async get_product_details(_userId, args) {
    const product = await Product.findById(args.product_id)
      .select('name description brand category price totalQty totalSold colors sizes images')
      .populate('reviews')

    if (!product) return { error: 'Product not found.' }

    const id = String(product._id)
    return {
      id,
      name: product.name,
      description: product.description,
      brand: product.brand,
      category: product.category,
      price: product.price,
      inStock: product.totalQty - product.totalSold > 0,
      qtyLeft: product.totalQty - product.totalSold,
      colors: product.colors,
      sizes: product.sizes,
      images: product.images,
      totalReviews: product.reviews?.length || 0,
      productUrl: `/products/${id}`,
    }
  },

  async get_categories() {
    const categories = await Category.find().select('name products image')
    return categories.map((c) => ({
      name: c.name,
      productCount: c.products?.length || 0,
      image: c.image || null,
    }))
  },

  async get_brands() {
    const brands = await Brand.find().select('name products')
    return brands.map((b) => ({
      name: b.name,
      productCount: b.products?.length || 0,
    }))
  },

  async get_active_coupons() {
    const coupons = await Coupon.find()
      .select('code discount startDate endDate')
      .sort({ createdAt: -1 })

    const live = coupons.filter((c) => isCouponLive(c))
    if (!live.length) return { message: 'No active coupons available right now.' }

    return live.map((c) => ({
      code: c.code,
      discount: c.discount,
      daysLeft: c.daysLeft,
      validUntil: c.endDate,
    }))
  },

  async get_my_addresses(userId) {
    const result = await listShippingAddresses(userId)
    if (result.message) return result
    return result.addresses
  },

  async add_shipping_address(userId, args) {
    return addShippingAddress(userId, args)
  },

  async update_shipping_address(userId, args) {
    return updateShippingAddress(userId, args)
  },

  async get_cart(userId) {
    const cart = await getCart(userId)
    if (cart.isEmpty) {
      return { message: 'Your cart is empty.', cart }
    }
    return {
      ...cart,
      summary: `${cart.lineCount} product line(s), ${cart.totalUnits} unit(s) total, ₹${cart.total}`,
    }
  },

  async add_to_cart(userId, args) {
    const qty = Math.max(1, Number(args.qty) || 1)
    const productId = args.product_id

    const product = await Product.findById(productId).select('colors sizes')
    if (!product) {
      return { error: 'Product not found.' }
    }

    const matchedColor = resolveOptionMatch(args.color, product.colors)
    const matchedSize = resolveOptionMatch(args.size, product.sizes)
    if (!matchedColor || !matchedSize) {
      return {
        error: `Invalid variant. Colors: ${product.colors.join(', ')}. Sizes: ${product.sizes.join(', ')}.`,
      }
    }

    const current = await getCart(userId)
    const existing = current.items.find(
      (item) =>
        String(item._id) === String(productId) &&
        item.color === matchedColor &&
        item.size === matchedSize
    )

    let cart
    if (existing) {
      cart = await updateItemQty(userId, {
        productId,
        color: matchedColor,
        size: matchedSize,
        qty,
      })
    } else {
      cart = await addItem(userId, {
        productId,
        color: matchedColor,
        size: matchedSize,
        qty,
      })
    }

    return {
      success: true,
      message: existing
        ? 'Cart quantity updated for this item'
        : 'Item added to cart',
      cart,
      clientAction: 'sync_cart',
    }
  },

  async update_cart_item(userId, args) {
    const cart = await updateItemQty(userId, {
      productId: args.product_id,
      color: args.color,
      size: args.size,
      qty: args.qty,
    })
    return {
      success: true,
      message: args.qty === 0 ? 'Item removed from cart' : 'Cart updated',
      cart,
      clientAction: 'sync_cart',
    }
  },

  async apply_coupon_to_cart(userId, args) {
    const cart = await applyCoupon(userId, args.code)
    return {
      success: true,
      message: `Coupon ${cart.couponCode} applied`,
      cart,
      clientAction: 'sync_cart',
    }
  },

  async remove_coupon_from_cart(userId) {
    const cart = await removeCoupon(userId)
    return {
      success: true,
      message: 'Coupon removed from cart',
      cart,
      clientAction: 'sync_cart',
    }
  },

  async preview_checkout(userId, args) {
    const addressIndex = Number.isFinite(args.address_index)
      ? args.address_index
      : undefined
    return previewCheckout(userId, { addressIndex })
  },

  async get_order_cancel_return_status(userId, args) {
    const order = await resolveOrderForUser(userId, {
      order_id: args.order_id,
      order_number: args.order_number,
    })
    return getOrderCancelReturnStatus(order)
  },

  async cancel_order(userId, args) {
    return cancelOrderByReference(userId, args)
  },

  async submit_return_request(userId, args) {
    return submitReturnByReference(userId, args)
  },

  async create_checkout_session(userId, args) {
    const addressIndex = Number.isFinite(args.address_index)
      ? args.address_index
      : undefined
    const preview = await previewCheckout(userId, { addressIndex })
    if (!preview.ready) {
      return {
        error: 'Checkout not ready',
        missing: preview.missing,
        shippingAddressError: preview.shippingAddressError,
        hint:
          preview.missing?.includes('shipping_address')
            ? 'Ask the user to add a shipping address in their profile, or use address index from get_my_addresses.'
            : 'Cart may be empty — add items first.',
      }
    }

    const session = await checkoutFromCart(userId, { addressIndex })

    return {
      success: true,
      orderId: session.orderId,
      orderNumber: session.orderNumber,
      totalPrice: session.totalPrice,
      checkoutUrl: session.url,
      message:
        'Checkout session created. Payment opens in a new tab. Cart has been cleared.',
      clientAction: 'open_checkout',
    }
  },
}

export async function executeTool(toolName, userId, args) {
  const executor = toolExecutors[toolName]
  if (!executor) return { error: `Unknown tool: ${toolName}` }

  try {
    return await executor(userId, args || {})
  } catch (err) {
    console.error(`Tool ${toolName} error:`, err.message)
    return {
      error:
        err.message ||
        'Something went wrong while looking that up. Please try again.',
    }
  }
}
