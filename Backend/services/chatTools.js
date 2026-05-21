import Order from '../model/Order.js'
import Product from '../model/Product.js'
import Category from '../model/Category.js'
import Brand from '../model/Brand.js'
import Coupon from '../model/Coupon.js'
import User from '../model/User.js'

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
        "Get the current user's saved shipping addresses. Use when user asks about their addresses or delivery info.",
      parameters: {
        type: 'object',
        properties: {},
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
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalPrice: order.totalPrice,
      currency: order.currency || 'INR',
      coupon: order.coupon || null,
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
    const conditions = []

    if (args.query) {
      const words = args.query.trim().split(/\s+/).filter(Boolean)
      if (words.length > 0) {
        const wordConditions = words.map((w) => {
          const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          return {
            $or: [
              { name: { $regex: escaped, $options: 'i' } },
              { description: { $regex: escaped, $options: 'i' } },
              { category: { $regex: escaped, $options: 'i' } },
              { brand: { $regex: escaped, $options: 'i' } },
              { tags: { $regex: escaped, $options: 'i' } },
            ],
          }
        })
        conditions.push({ $or: wordConditions })
      }
    }
    if (args.category) conditions.push({ category: { $regex: args.category, $options: 'i' } })
    if (args.brand) conditions.push({ brand: { $regex: args.brand, $options: 'i' } })
    if (args.color) conditions.push({ colors: { $regex: args.color, $options: 'i' } })
    if (args.min_price || args.max_price) {
      const priceFilter = {}
      if (args.min_price) priceFilter.$gte = args.min_price
      if (args.max_price) priceFilter.$lte = args.max_price
      conditions.push({ price: priceFilter })
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {}
    const limit = Math.min(Math.max(args.limit || 8, 1), 15)
    const products = await Product.find(filter).limit(limit).select(
      'name brand category price totalQty totalSold colors sizes images description tags'
    )

    if (!products.length) {
      return {
        count: 0,
        products: [],
        message: 'No products found in the catalog for this search.',
        rule: 'Tell the user nothing matched. Do NOT suggest or name products that were not returned here.',
      }
    }

    const mapped = products.map((p) => {
      const id = String(p._id)
      return {
        id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: p.price,
        inStock: p.totalQty - p.totalSold > 0,
        qtyLeft: p.totalQty - p.totalSold,
        colors: p.colors,
        sizes: p.sizes,
        image: p.images?.[0] || null,
        productUrl: `/products/${id}`,
      }
    })

    return {
      count: mapped.length,
      products: mapped,
      rule:
        'List ONLY these products with EXACT names, prices, and stock from this response. Include each productUrl as a markdown link: [View product](productUrl). Never add products not in this list.',
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
    const coupons = await Coupon.find({ endDate: { $gte: new Date() } })
      .select('code discount startDate endDate')
      .sort({ createdAt: -1 })

    if (!coupons.length) return { message: 'No active coupons available right now.' }

    return coupons.map((c) => ({
      code: c.code,
      discount: c.discount,
      daysLeft: c.daysLeft,
      validUntil: c.endDate,
    }))
  },

  async get_my_addresses(userId) {
    const user = await User.findById(userId).select('shippingAddresses hasShippingAddress')
    if (!user?.hasShippingAddress || !user.shippingAddresses?.length) {
      return { message: 'You have no saved shipping addresses.' }
    }

    return user.shippingAddresses.map((a) => ({
      id: a._id,
      name: `${a.firstName || ''} ${a.lastName || ''}`.trim(),
      address: a.address,
      city: a.city,
      province: a.province,
      postalCode: a.postalCode,
      country: a.country,
      phone: a.phone,
    }))
  },
}

export async function executeTool(toolName, userId, args) {
  const executor = toolExecutors[toolName]
  if (!executor) return { error: `Unknown tool: ${toolName}` }

  try {
    return await executor(userId, args || {})
  } catch (err) {
    console.error(`Tool ${toolName} error:`, err.message)
    return { error: 'Something went wrong while looking that up. Please try again.' }
  }
}
