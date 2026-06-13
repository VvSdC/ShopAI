import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import './initZodOpenApi.js'
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
} from '../validations/authSchemas.js'
import {
  addCartItemSchema,
  updateCartItemSchema,
  removeCartItemSchema,
  applyCartCouponSchema,
  syncCartSchema,
} from '../validations/cartSchemas.js'
import { chatMessageSchema } from '../validations/chatSchemas.js'
import { createOrderSchema } from '../validations/orderSchemas.js'
import {
  createReturnSchema,
  approveReturnSchema,
  rejectReturnSchema,
} from '../validations/returnSchemas.js'
import { createReviewSchema, updateReviewSchema } from '../validations/reviewSchemas.js'

export const registry = new OpenAPIRegistry()

registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'shopai_token',
  description: 'JWT access token set on login',
})

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Alternative to cookie auth',
})

registry.registerComponent('securitySchemes', 'csrfHeader', {
  type: 'apiKey',
  in: 'header',
  name: 'x-csrf-token',
  description: 'Required on mutating requests; pair with shopai_csrf cookie',
})

export const ErrorResponse = registry.register(
  'ErrorResponse',
  z
    .object({
      message: z.string(),
      errors: z
        .array(
          z.object({
            field: z.string(),
            message: z.string(),
          })
        )
        .optional(),
    })
    .openapi('ErrorResponse')
)

export const LoginBody = registry.register('LoginBody', loginSchema.openapi('LoginBody'))
export const RegisterBody = registry.register(
  'RegisterBody',
  registerSchema.openapi('RegisterBody')
)
export const ChangePasswordBody = registry.register(
  'ChangePasswordBody',
  changePasswordSchema.openapi('ChangePasswordBody')
)
export const ResetPasswordBody = registry.register(
  'ResetPasswordBody',
  resetPasswordSchema.openapi('ResetPasswordBody')
)

export const AddCartItemBody = registry.register(
  'AddCartItemBody',
  addCartItemSchema.openapi('AddCartItemBody')
)
export const UpdateCartItemBody = registry.register(
  'UpdateCartItemBody',
  updateCartItemSchema.openapi('UpdateCartItemBody')
)
export const RemoveCartItemBody = registry.register(
  'RemoveCartItemBody',
  removeCartItemSchema.openapi('RemoveCartItemBody')
)
export const ApplyCartCouponBody = registry.register(
  'ApplyCartCouponBody',
  applyCartCouponSchema.openapi('ApplyCartCouponBody')
)
export const SyncCartBody = registry.register('SyncCartBody', syncCartSchema.openapi('SyncCartBody'))

export const ChatMessageBody = registry.register(
  'ChatMessageBody',
  chatMessageSchema.openapi('ChatMessageBody')
)

export const CreateOrderBody = registry.register(
  'CreateOrderBody',
  createOrderSchema.openapi('CreateOrderBody')
)

export const CreateReturnBody = registry.register(
  'CreateReturnBody',
  createReturnSchema.openapi('CreateReturnBody')
)
export const ApproveReturnBody = registry.register(
  'ApproveReturnBody',
  approveReturnSchema.openapi('ApproveReturnBody')
)
export const RejectReturnBody = registry.register(
  'RejectReturnBody',
  rejectReturnSchema.openapi('RejectReturnBody')
)

export const CreateReviewBody = registry.register(
  'CreateReviewBody',
  createReviewSchema.openapi('CreateReviewBody')
)
export const UpdateReviewBody = registry.register(
  'UpdateReviewBody',
  updateReviewSchema.openapi('UpdateReviewBody')
)

export const HealthResponse = registry.register(
  'HealthResponse',
  z
    .object({
      status: z.literal('ok'),
      env: z.string(),
      timestamp: z.string().datetime(),
    })
    .openapi('HealthResponse')
)
