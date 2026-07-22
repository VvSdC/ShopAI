import logger from '../utils/logger.js'
import Product from '../model/Product.js'
import { categoryDisplayName } from '../utils/categoryRef.js'
import { brandDisplayName, enrichProductsWithBrandNames } from '../utils/brandRef.js'
import { reviewStatsByProductIds } from './productListStats.js'
import Category from '../model/Category.js'
import Brand from '../model/Brand.js'
import {
  countProductsByBrandId,
  countProductsByCategoryId,
} from './catalogProductCounts.js'
import Coupon from '../model/Coupon.js'
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
import { resolveSizeForProduct } from './cartVariantMatch.js'
import { searchProductsForChat } from './search/searchService.js'
import { getSimilarProducts } from './similarProductsService.js'
import { isGuestChatUser, getGuestCartState } from './guestCartContext.js'
import {
  guestGetCart,
  guestAddToCart,
  guestUpdateCartItem,
  guestApplyCoupon,
  guestRemoveCoupon,
  guestCheckoutBlocked,
} from './guestCartService.js'
import { buildSignInRequiredToolResult } from './guestChatRestrictions.js'
import {
  listShippingAddresses,
  addShippingAddress,
  updateShippingAddress,
  AddressValidationError,
} from './addressService.js'
import {
  getOrderCancelReturnStatus,
  cancelOrderByReference,
  submitReturnByReference,
  resolveOrderForUser,
} from './orderActionsService.js'
import { orderService } from './orderService.js'
import {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
} from './wishlistService.js'

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
      name: 'get_similar_products',
      description:
        'Get grounded similar products from the catalog using stored embeddings (same index as search). Use when the customer asks for alternatives, related items, or "something like this".',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'The source product ID to find neighbors for',
          },
          limit: {
            type: 'number',
            description: 'How many similar products to return (default 6, max 10)',
          },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_wishlist',
      description:
        "List products saved in the current user's wishlist. Use when the customer asks about saved items or favorites.",
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_wishlist',
      description: 'Save a product to the signed-in user wishlist by product ID.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: 'Product MongoDB ID' },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_from_wishlist',
      description: 'Remove a product from the signed-in user wishlist by product ID.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: 'Product MongoDB ID' },
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
        "Get the current user's saved shipping addresses (choiceNumber 1, 2, … for the customer; addressIndex for tools). Use when user asks about their addresses or delivery info.",
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
        'Save a new shipping address to the user account. Use ONLY when the user has explicitly provided each field in the conversation. Never invent, guess, or auto-fill values — especially phone numbers, PIN codes, city, state, or street. If any required field is missing from what the user actually said, ask them for it first with a short prompt naming the missing fields — do NOT call this tool. Parse city, state/province, and pincode from the user\'s free-text when they provided them. Fall back to the user profile only for first/last name and phone.',
      parameters: {
        type: 'object',
        properties: {
          first_name: { type: 'string', description: 'First name from the user or profile — never invent.' },
          last_name: { type: 'string', description: 'Last name from the user or profile — never invent.' },
          address: { type: 'string', description: 'Street address line as provided by the user.' },
          city: { type: 'string', description: 'City as provided by the user.' },
          province: { type: 'string', description: 'State or province (e.g. Telangana) as provided by the user.' },
          postal_code: {
            type: 'string',
            description: 'Indian PIN code — exactly 6 digits. Ask the user if they did not provide one.',
            pattern: '^\\d{6}$',
          },
          country: { type: 'string', description: 'Country code or name (default India/IN)' },
          phone: {
            type: 'string',
            description:
              'Contact phone — Indian mobile only: 10 digits starting 6–9, optionally prefixed with +91 or 91. NEVER invent or guess a phone number. If the user did not provide one and no profile phone is available, ask them.',
            pattern: '^(?:\\+?91[-\\s]?)?[6-9]\\d{9}$',
          },
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
        'Update an existing saved shipping address by index (from get_my_addresses). Use when user wants to change their delivery address. Never invent field values — only pass fields the user explicitly changed.',
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
          postal_code: { type: 'string', pattern: '^\\d{6}$' },
          country: { type: 'string' },
          phone: {
            type: 'string',
            description:
              'Indian mobile only: 10 digits starting 6–9, optionally prefixed +91. Never invent.',
            pattern: '^(?:\\+?91[-\\s]?)?[6-9]\\d{9}$',
          },
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
        'Add a product to the cart. Requires product_id, color, and qty. Size is required for multi-size apparel; use "One Size" when get_product_details shows sizeMeasurementType "none" or only one size. Call get_product_details first if size/color are unknown. If the same product+size+color is already in cart, this SETS the quantity (does not stack duplicates). Do NOT call again on checkout confirmation — use get_cart instead.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: 'Product MongoDB ID' },
          size: {
            type: 'string',
            description: 'Size e.g. M, L, or "One Size" when the product has no sizes',
          },
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
              'address_index from get_my_addresses (0-based addressIndex). Omit to use the most recently added address.',
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
              'address_index from get_my_addresses (0-based addressIndex). Omit to use the most recently added address.',
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
    if (isGuestChatUser(userId)) {
      return buildSignInRequiredToolResult(null, { route: 'order_summary' })
    }
    const limit = Math.min(Math.max(args.limit || 5, 1), 10)
    return orderService.listForChat(userId, limit)
  },

  async get_order_details(userId, args) {
    if (isGuestChatUser(userId)) {
      return buildSignInRequiredToolResult(null, { route: 'order_summary' })
    }
    return orderService.getDetailsForChat(userId, {
      order_id: args.order_id,
      order_number: args.order_number,
    })
  },

  async search_products(_userId, args) {
    const limit = Math.min(Math.max(args.limit || 8, 1), 15)
    return searchProductsForChat(_userId, {
      query: args.query,
      category: args.category,
      brand: args.brand,
      color: args.color,
      min_price: args.min_price,
      max_price: args.max_price,
      limit,
    })
  },

  async get_product_details(_userId, args) {
    const product = await Product.findById(args.product_id)
      .select(
        'name description brand category price totalQty totalSold colors sizes sizeMeasurementType sizeLabel images'
      )
      .populate('category', 'name')

    if (!product) return { error: 'Product not found.' }

    const [productWithBrand] = await enrichProductsWithBrandNames([product.toObject()])
    const statsMap = await reviewStatsByProductIds([product._id])
    const reviewStats = statsMap.get(String(product._id)) || { totalReviews: 0 }
    const id = String(productWithBrand._id)
    return {
      id,
      name: productWithBrand.name,
      description: productWithBrand.description,
      brand: brandDisplayName(productWithBrand.brand),
      category: categoryDisplayName(productWithBrand.category),
      price: productWithBrand.price,
      inStock: productWithBrand.totalQty - productWithBrand.totalSold > 0,
      qtyLeft: productWithBrand.totalQty - productWithBrand.totalSold,
      colors: productWithBrand.colors,
      sizes: productWithBrand.sizes,
      sizeMeasurementType: productWithBrand.sizeMeasurementType || 'apparel',
      sizeLabel: productWithBrand.sizeLabel || '',
      images: productWithBrand.images,
      totalReviews: reviewStats.totalReviews,
      productUrl: `/products/${id}`,
    }
  },

  async get_similar_products(_userId, args) {
    const limit = Math.min(Math.max(args.limit || 6, 1), 10)
    const result = await getSimilarProducts(args.product_id, { limit })
    return {
      count: result.count,
      products: result.products,
      mode: result.mode,
      grounded: result.grounded,
      message: result.explanation,
    }
  },

  async get_my_wishlist(userId) {
    if (isGuestChatUser(userId)) {
      return buildSignInRequiredToolResult(null, { route: 'wishlist' })
    }
    const wishlist = await getWishlist(userId)
    return {
      count: wishlist.count || 0,
      items: wishlist.items || [],
    }
  },

  async add_to_wishlist(userId, args) {
    if (isGuestChatUser(userId)) {
      return buildSignInRequiredToolResult(null, { route: 'wishlist' })
    }
    const wishlist = await addWishlistItem(userId, args.product_id)
    return {
      success: true,
      message: 'Saved to wishlist',
      count: wishlist.count || 0,
    }
  },

  async remove_from_wishlist(userId, args) {
    if (isGuestChatUser(userId)) {
      return buildSignInRequiredToolResult(null, { route: 'wishlist' })
    }
    const wishlist = await removeWishlistItem(userId, args.product_id)
    return {
      success: true,
      message: 'Removed from wishlist',
      count: wishlist.count || 0,
    }
  },

  async get_categories() {
    const [categories, counts] = await Promise.all([
      Category.find().select('name image').lean(),
      countProductsByCategoryId(),
    ])
    return categories.map((c) => ({
      name: c.name,
      productCount: counts.get(String(c._id)) || 0,
      image: c.image || null,
    }))
  },

  async get_brands() {
    const [brands, counts] = await Promise.all([
      Brand.find().select('name').lean(),
      countProductsByBrandId(),
    ])
    return brands.map((b) => ({
      name: b.name,
      productCount: counts.get(String(b._id)) || 0,
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
    if (isGuestChatUser(userId)) {
      return guestCheckoutBlocked()
    }
    const result = await listShippingAddresses(userId)
    if (result.message) {
      return {
        ...result,
        profileUrl: '/customer-profile',
        rule: 'Never invent /addresses/ URLs. Direct users to [My Profile](/customer-profile) to manage addresses.',
      }
    }
    return {
      count: result.addresses.length,
      addresses: result.addresses.map((a) => ({
        choiceNumber: a.choiceNumber,
        addressIndex: a.addressIndex,
        label: `${a.city}, ${a.province}`,
        city: a.city,
        province: a.province,
        address: a.address,
        postalCode: a.postalCode,
        name: a.name,
        profileUrl: '/customer-profile',
      })),
      rule:
        'Show addresses to the customer as **1**, **2**, etc. (choiceNumber). Never say "Index 0" or expose addressIndex in user-facing text. For checkout tools use address_index = addressIndex. Link only to [My Profile](/customer-profile).',
    }
  },

  async add_shipping_address(userId, args) {
    if (isGuestChatUser(userId)) {
      return guestCheckoutBlocked()
    }
    try {
      return await addShippingAddress(userId, args)
    } catch (err) {
      if (err instanceof AddressValidationError) {
        return {
          error: 'address_validation_failed',
          missing: err.missing,
          invalid: err.invalid,
          message: err.message,
        }
      }
      throw err
    }
  },

  async update_shipping_address(userId, args) {
    if (isGuestChatUser(userId)) {
      return guestCheckoutBlocked()
    }
    try {
      return await updateShippingAddress(userId, args)
    } catch (err) {
      if (err instanceof AddressValidationError) {
        return {
          error: 'address_validation_failed',
          missing: err.missing,
          invalid: err.invalid,
          message: err.message,
        }
      }
      throw err
    }
  },

  async get_cart(userId) {
    if (isGuestChatUser(userId)) {
      const state = getGuestCartState()
      const cart = await guestGetCart(state)
      if (cart.isEmpty) {
        return { message: 'Your cart is empty.', cart }
      }
      return {
        ...cart,
        summary: `${cart.lineCount} product line(s), ${cart.totalUnits} unit(s) total, ₹${cart.total}`,
      }
    }

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
    if (isGuestChatUser(userId)) {
      return guestAddToCart(getGuestCartState(), args)
    }

    const qty = Math.max(1, Number(args.qty) || 1)
    const productId = args.product_id

    const product = await Product.findById(productId).select(
      'colors sizes sizeMeasurementType name'
    )
    if (!product) {
      return { error: 'Product not found.' }
    }

    const matchedColor = resolveOptionMatch(args.color, product.colors)
    const matchedSize = resolveSizeForProduct(args.size, product)
    if (!matchedColor || !matchedSize) {
      return {
        error: `Invalid variant. Colors: ${product.colors.join(', ')}. Sizes: ${(product.sizes || []).join(', ') || 'One Size'}.`,
      }
    }

    const current = await getCart(userId)
    const existing = current.items.find(
      (item) =>
        String(item._id) === String(productId) &&
        item.color === matchedColor &&
        item.size === matchedSize
    )

    const cart = await addItem(userId, {
      productId,
      color: matchedColor,
      size: matchedSize,
      qty,
    })

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
    if (isGuestChatUser(userId)) {
      return guestUpdateCartItem(getGuestCartState(), args)
    }

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
    if (isGuestChatUser(userId)) {
      return guestApplyCoupon(getGuestCartState(), args.code)
    }

    const cart = await applyCoupon(userId, args.code)
    return {
      success: true,
      message: `Coupon ${cart.couponCode} applied`,
      cart,
      clientAction: 'sync_cart',
    }
  },

  async remove_coupon_from_cart(userId) {
    if (isGuestChatUser(userId)) {
      return guestRemoveCoupon(getGuestCartState())
    }

    const cart = await removeCoupon(userId)
    return {
      success: true,
      message: 'Coupon removed from cart',
      cart,
      clientAction: 'sync_cart',
    }
  },

  async preview_checkout(userId, args) {
    if (isGuestChatUser(userId)) {
      return guestCheckoutBlocked()
    }

    const addressIndex = Number.isFinite(args.address_index)
      ? args.address_index
      : undefined
    return previewCheckout(userId, { addressIndex })
  },

  async get_order_cancel_return_status(userId, args) {
    if (isGuestChatUser(userId)) {
      return buildSignInRequiredToolResult(null, { route: 'order_update' })
    }
    const order = await resolveOrderForUser(userId, {
      order_id: args.order_id,
      order_number: args.order_number,
    })
    return getOrderCancelReturnStatus(order)
  },

  async cancel_order(userId, args) {
    if (isGuestChatUser(userId)) {
      return buildSignInRequiredToolResult(null, { route: 'order_update' })
    }
    return cancelOrderByReference(userId, args)
  },

  async submit_return_request(userId, args) {
    if (isGuestChatUser(userId)) {
      return buildSignInRequiredToolResult(null, { route: 'order_update' })
    }
    return submitReturnByReference(userId, args)
  },

  async create_checkout_session(userId, args) {
    if (isGuestChatUser(userId)) {
      return guestCheckoutBlocked()
    }

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
      checkoutSource: session.checkoutSource || 'chat',
      expiresAt: session.expiresAt,
      message:
        'Checkout session created. Use the Pay on Stripe button in chat. You have 5 minutes to complete payment.',
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
    logger.error(`Tool ${toolName} error:`, err.message)
    return {
      error:
        err.message ||
        'Something went wrong while looking that up. Please try again.',
    }
  }
}
