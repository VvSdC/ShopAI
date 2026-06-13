import { z } from 'zod'
import './initZodOpenApi.js'

/** @typedef {import('@asteasolutions/zod-to-openapi').RouteConfig} RouteConfig */

export const objectIdParam = (name, description = 'MongoDB ObjectId') =>
  z.string().openapi({
    param: { name, in: 'path', required: true },
    description,
    example: '507f1f77bcf86cd799439011',
  })

export const mongoIdParams = (name = 'id') =>
  z.object({
    [name]: objectIdParam(name),
  })

export const jsonBody = (schema) => ({
  required: true,
  content: {
    'application/json': { schema },
  },
})

export const jsonResponse = (description = 'Success', schema = z.object({}).passthrough()) => ({
  description,
  content: {
    'application/json': { schema },
  },
})

export const errorResponses = {
  400: jsonResponse('Validation or bad request'),
  401: jsonResponse('Authentication required'),
  403: jsonResponse('Forbidden'),
  404: jsonResponse('Not found'),
  429: jsonResponse('Rate limit exceeded'),
  500: jsonResponse('Server error'),
}

/** Cookie `shopai_token` or `Authorization: Bearer` JWT. */
export const userSecurity = [{ cookieAuth: [] }, { bearerAuth: [] }]

/** Same auth as user routes; handler also requires admin role. */
export const adminSecurity = [{ cookieAuth: [] }, { bearerAuth: [] }]

/**
 * @param {Partial<RouteConfig>} config
 * @returns {RouteConfig}
 */
export function route(config) {
  const { responses, ...rest } = config
  return {
    ...rest,
    responses: {
      200: jsonResponse('Success'),
      ...errorResponses,
      ...responses,
    },
  }
}
