import { registry } from '../schemas.js'
import {
  route,
  jsonBody,
  mongoIdParams,
  userSecurity,
  adminSecurity,
} from '../helpers.js'
import {
  AddCartItemBody,
  UpdateCartItemBody,
  RemoveCartItemBody,
  ApplyCartCouponBody,
  SyncCartBody,
  CreateOrderBody,
} from '../schemas.js'
import { z } from 'zod'

export function registerCommercePaths() {
  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/cart/',
      tags: ['Cart'],
      summary: 'Get cart',
      security: userSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/cart/items',
      tags: ['Cart'],
      summary: 'Add cart item',
      security: userSecurity,
      request: { body: jsonBody(AddCartItemBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'patch',
      path: '/shopai/cart/items',
      tags: ['Cart'],
      summary: 'Update cart item quantity',
      security: userSecurity,
      request: { body: jsonBody(UpdateCartItemBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'delete',
      path: '/shopai/cart/items',
      tags: ['Cart'],
      summary: 'Remove cart item',
      security: userSecurity,
      request: { body: jsonBody(RemoveCartItemBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/cart/coupon',
      tags: ['Cart'],
      summary: 'Apply coupon to cart',
      security: userSecurity,
      request: { body: jsonBody(ApplyCartCouponBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'delete',
      path: '/shopai/cart/coupon',
      tags: ['Cart'],
      summary: 'Remove coupon from cart',
      security: userSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/cart/sync',
      tags: ['Cart'],
      summary: 'Sync local cart items to server',
      security: userSecurity,
      request: { body: jsonBody(SyncCartBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/cart/validate',
      tags: ['Cart'],
      summary: 'Validate cart stock and pricing',
      security: userSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/orders/',
      tags: ['Orders'],
      summary: 'Create order and Stripe checkout session',
      security: userSecurity,
      request: { body: jsonBody(CreateOrderBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/orders/my-orders',
      tags: ['Orders'],
      summary: 'List current user orders',
      security: userSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/orders/verify-payment/{session_id}',
      tags: ['Orders'],
      summary: 'Verify Stripe checkout session',
      security: userSecurity,
      request: {
        params: z.object({
          session_id: z.string().openapi({
            param: { name: 'session_id', in: 'path', required: true },
            example: 'cs_test_a1b2c3',
          }),
        }),
      },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/orders/payment-status/{orderId}',
      tags: ['Orders'],
      summary: 'Poll order payment status',
      security: userSecurity,
      request: { params: mongoIdParams('orderId') },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/orders/expire-checkout/{orderId}',
      tags: ['Orders'],
      summary: 'Expire pending checkout session',
      security: userSecurity,
      request: { params: mongoIdParams('orderId') },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/orders/resend-confirmation/{session_id}',
      tags: ['Orders'],
      summary: 'Resend order confirmation email',
      security: userSecurity,
      request: {
        params: z.object({
          session_id: z.string().openapi({
            param: { name: 'session_id', in: 'path', required: true },
          }),
        }),
      },
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/orders/cancel/{id}',
      tags: ['Orders'],
      summary: 'Cancel order',
      security: userSecurity,
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/orders/{id}',
      tags: ['Orders'],
      summary: 'Get order by id',
      security: userSecurity,
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/orders/',
      tags: ['Orders', 'Admin'],
      summary: 'List all orders',
      security: adminSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/orders/sales/stats',
      tags: ['Orders', 'Admin'],
      summary: 'Sales statistics',
      security: adminSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/orders/update/{id}',
      tags: ['Orders', 'Admin'],
      summary: 'Update order status',
      security: adminSecurity,
      request: { params: mongoIdParams('id'), body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/coupons/active',
      tags: ['Coupons'],
      summary: 'List active public coupons',
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/coupons/single',
      tags: ['Coupons'],
      summary: 'Get coupon by code (authenticated)',
      security: userSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/coupons/',
      tags: ['Coupons', 'Admin'],
      summary: 'List all coupons',
      security: adminSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/coupons/',
      tags: ['Coupons', 'Admin'],
      summary: 'Create coupon',
      security: adminSecurity,
      request: { body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/coupons/update/{id}',
      tags: ['Coupons', 'Admin'],
      summary: 'Update coupon',
      security: adminSecurity,
      request: { params: mongoIdParams('id'), body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'delete',
      path: '/shopai/coupons/delete/{id}',
      tags: ['Coupons', 'Admin'],
      summary: 'Delete coupon',
      security: adminSecurity,
      request: { params: mongoIdParams('id') },
    })
  )
}
