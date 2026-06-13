import { registry } from '../schemas.js'
import { route, jsonBody, mongoIdParams, objectIdParam, userSecurity, adminSecurity } from '../helpers.js'
import {
  CreateReviewBody,
  UpdateReviewBody,
  CreateReturnBody,
  ApproveReturnBody,
  RejectReturnBody,
  ChatMessageBody,
  HealthResponse,
} from '../schemas.js'
import { z } from 'zod'

export function registerSocialPaths() {
  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/reviews/{productID}',
      tags: ['Reviews'],
      summary: 'Create product review',
      security: userSecurity,
      request: {
        params: mongoIdParams('productID'),
        body: jsonBody(CreateReviewBody),
      },
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/reviews/{id}',
      tags: ['Reviews'],
      summary: 'Update review',
      security: userSecurity,
      request: { params: mongoIdParams('id'), body: jsonBody(UpdateReviewBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'delete',
      path: '/shopai/reviews/{id}/product/{productID}',
      tags: ['Reviews'],
      summary: 'Delete review',
      security: userSecurity,
      request: {
        params: z.object({
          id: objectIdParam('id'),
          productID: objectIdParam('productID'),
        }),
      },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/returns/reasons',
      tags: ['Returns'],
      summary: 'Return reason codes',
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/returns/my',
      tags: ['Returns'],
      summary: 'List current user returns',
      security: userSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/returns/eligibility/{orderId}',
      tags: ['Returns'],
      summary: 'Check return eligibility for order',
      security: userSecurity,
      request: { params: mongoIdParams('orderId') },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/returns/{orderId}',
      tags: ['Returns'],
      summary: 'Create return request',
      security: userSecurity,
      request: { params: mongoIdParams('orderId'), body: jsonBody(CreateReturnBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/returns/stats',
      tags: ['Returns', 'Admin'],
      summary: 'Return statistics',
      security: adminSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/returns/admin/all',
      tags: ['Returns', 'Admin'],
      summary: 'List all returns',
      security: adminSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/returns/{id}/approve',
      tags: ['Returns', 'Admin'],
      summary: 'Approve return',
      security: adminSecurity,
      request: { params: mongoIdParams('id'), body: jsonBody(ApproveReturnBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/returns/{id}/reject',
      tags: ['Returns', 'Admin'],
      summary: 'Reject return',
      security: adminSecurity,
      request: { params: mongoIdParams('id'), body: jsonBody(RejectReturnBody) },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/chat/sessions',
      tags: ['Chat'],
      summary: 'List chat sessions',
      security: userSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/chat/sessions',
      tags: ['Chat'],
      summary: 'Create chat session',
      security: userSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/chat/sessions/{id}',
      tags: ['Chat'],
      summary: 'Get chat session (latest messages page)',
      description: 'Returns the newest page of messages (default 20). Use `/sessions/{id}/messages` to load older pages.',
      security: userSecurity,
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/chat/sessions/{id}/messages',
      tags: ['Chat'],
      summary: 'Load older chat messages',
      description: 'Pass `beforeMessageId` = `_id` of the oldest message already shown in the client.',
      security: userSecurity,
      request: {
        params: mongoIdParams('id'),
        query: z.object({
          beforeMessageId: z.string().optional().openapi({ description: 'Oldest loaded message id (cursor for older pages)' }),
          limit: z.string().optional().openapi({ description: 'Page size (max 50, default 20)' }),
        }),
      },
    })
  )

  registry.registerPath(
    route({
      method: 'delete',
      path: '/shopai/chat/sessions/{id}',
      tags: ['Chat'],
      summary: 'Delete chat session',
      security: userSecurity,
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/chat/message',
      tags: ['Chat'],
      summary: 'Send message to shopping assistant',
      security: userSecurity,
      request: { body: jsonBody(ChatMessageBody) },
    })
  )
}

export function registerAdminPaths() {
  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/analytics/inference/providers',
      tags: ['Analytics', 'Admin'],
      summary: 'LLM provider status',
      security: adminSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/analytics/inference/test',
      tags: ['Analytics', 'Admin'],
      summary: 'Test LLM inference',
      security: adminSecurity,
      request: { body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/analytics/chat-eval/cases',
      tags: ['Analytics', 'Admin'],
      summary: 'Chat eval test cases',
      security: adminSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/analytics/chat-eval/run',
      tags: ['Analytics', 'Admin'],
      summary: 'Run chat eval job',
      security: adminSecurity,
      request: { body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/analytics/chat-eval/status/{jobId}',
      tags: ['Analytics', 'Admin'],
      summary: 'Chat eval job status',
      security: adminSecurity,
      request: { params: mongoIdParams('jobId') },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/analytics/chat-usage',
      tags: ['Analytics', 'Admin'],
      summary: 'Chat LLM usage analytics',
      security: adminSecurity,
    })
  )
}

export function registerSystemPaths() {
  registry.registerPath(
    route({
      method: 'get',
      path: '/health',
      tags: ['System'],
      summary: 'Health check',
      responses: { 200: { description: 'Service healthy', content: { 'application/json': { schema: HealthResponse } } } },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/policy/',
      tags: ['Policy'],
      summary: 'Store return/refund policy',
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/webhook',
      tags: ['System'],
      summary: 'Stripe webhook',
      description: 'Raw Stripe event payload with `Stripe-Signature` header. CSRF not required.',
      request: {
        body: {
          required: true,
          content: {
            'application/json': {
              schema: z.object({ type: z.string() }).passthrough(),
            },
          },
        },
      },
    })
  )
}
