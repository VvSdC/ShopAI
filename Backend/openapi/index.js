import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi'
import { config } from '../config/env.js'
import { registry } from './schemas.js'
import './paths/index.js'

/**
 * Build OpenAPI 3.0 document from registered Zod schemas and paths.
 * @param {{ serverUrl?: string }} [options]
 */
export function buildOpenApiDocument(options = {}) {
  const serverUrl =
    options.serverUrl ||
    config.server.publicUrl ||
    `http://localhost:${config.server.port}`

  const generator = new OpenApiGeneratorV3(registry.definitions)

  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'ShopAI API',
      version: '1.0.0',
      description: [
        'REST API for the ShopAI storefront: catalog, cart, orders, returns, chat assistant, and admin analytics.',
        '',
        '**Authentication:** JWT in `shopai_token` cookie or `Authorization: Bearer <token>`.',
        '**CSRF:** State-changing requests need `x-csrf-token` header matching `shopai_csrf` cookie (from GET /shopai/users/csrf-token).',
        '**Admin routes:** Require authenticated user with admin role.',
        '',
        'Request bodies marked with component schemas are validated with Zod at runtime.',
      ].join('\n'),
      contact: {
        name: 'ShopAI',
      },
    },
    servers: [{ url: serverUrl, description: config.nodeEnv }],
    tags: [
      { name: 'Auth', description: 'Login, register, password reset' },
      { name: 'Users', description: 'Profile and shipping addresses' },
      { name: 'Products', description: 'Product catalog' },
      { name: 'Categories', description: 'Product categories' },
      { name: 'Brands', description: 'Brands' },
      { name: 'Colors', description: 'Product colors' },
      { name: 'Cart', description: 'Server-side cart' },
      { name: 'Orders', description: 'Checkout and order management' },
      { name: 'Coupons', description: 'Discount coupons' },
      { name: 'Reviews', description: 'Product reviews' },
      { name: 'Returns', description: 'Return requests' },
      { name: 'Chat', description: 'LangGraph shopping assistant' },
      { name: 'Policy', description: 'Store policies' },
      { name: 'Analytics', description: 'Admin LLM analytics and eval' },
      { name: 'Admin', description: 'Admin-only operations' },
      { name: 'System', description: 'Health and webhooks' },
    ],
  })
}

export { registry } from './schemas.js'
