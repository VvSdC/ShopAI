import { registry } from '../schemas.js'
import { route, jsonBody, mongoIdParams, adminSecurity } from '../helpers.js'
import { z } from 'zod'

export function registerCatalogPaths() {
  const multipart = {
    required: true,
    content: {
      'multipart/form-data': {
        schema: z.object({}).passthrough(),
      },
    },
  }

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/products/mine',
      tags: ['Products', 'Admin'],
      summary: 'List products created by the current admin',
      security: adminSecurity,
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/products/',
      tags: ['Products'],
      summary: 'List products',
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/products/{id}',
      tags: ['Products'],
      summary: 'Get product',
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/products/validate-cart',
      tags: ['Products'],
      summary: 'Validate cart line items against catalog',
      request: { body: jsonBody(z.object({ items: z.array(z.object({}).passthrough()) })) },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/products/',
      tags: ['Products', 'Admin'],
      summary: 'Create product',
      security: adminSecurity,
      request: { body: multipart },
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/products/{id}',
      tags: ['Products', 'Admin'],
      summary: 'Update product',
      security: adminSecurity,
      request: { params: mongoIdParams('id'), body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'delete',
      path: '/shopai/products/{id}/delete',
      tags: ['Products', 'Admin'],
      summary: 'Delete product',
      security: adminSecurity,
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/categories/',
      tags: ['Categories'],
      summary: 'List categories',
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/categories/{id}',
      tags: ['Categories'],
      summary: 'Get category',
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/categories/',
      tags: ['Categories', 'Admin'],
      summary: 'Create category',
      security: adminSecurity,
      request: { body: multipart },
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/categories/{id}',
      tags: ['Categories', 'Admin'],
      summary: 'Update category',
      security: adminSecurity,
      request: { params: mongoIdParams('id'), body: multipart },
    })
  )

  registry.registerPath(
    route({
      method: 'delete',
      path: '/shopai/categories/{id}',
      tags: ['Categories', 'Admin'],
      summary: 'Delete category',
      security: adminSecurity,
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/brands/',
      tags: ['Brands'],
      summary: 'List brands',
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/brands/{id}',
      tags: ['Brands'],
      summary: 'Get brand',
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/brands/',
      tags: ['Brands', 'Admin'],
      summary: 'Create brand',
      security: adminSecurity,
      request: { body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/brands/{id}',
      tags: ['Brands', 'Admin'],
      summary: 'Update brand',
      security: adminSecurity,
      request: { params: mongoIdParams('id'), body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'delete',
      path: '/shopai/brands/{id}',
      tags: ['Brands', 'Admin'],
      summary: 'Delete brand',
      security: adminSecurity,
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/colors/',
      tags: ['Colors'],
      summary: 'List colors',
    })
  )

  registry.registerPath(
    route({
      method: 'get',
      path: '/shopai/colors/{id}',
      tags: ['Colors'],
      summary: 'Get color',
      request: { params: mongoIdParams('id') },
    })
  )

  registry.registerPath(
    route({
      method: 'post',
      path: '/shopai/colors/',
      tags: ['Colors', 'Admin'],
      summary: 'Create color',
      security: adminSecurity,
      request: { body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'put',
      path: '/shopai/colors/{id}',
      tags: ['Colors', 'Admin'],
      summary: 'Update color',
      security: adminSecurity,
      request: { params: mongoIdParams('id'), body: jsonBody(z.object({}).passthrough()) },
    })
  )

  registry.registerPath(
    route({
      method: 'delete',
      path: '/shopai/colors/{id}',
      tags: ['Colors', 'Admin'],
      summary: 'Delete color',
      security: adminSecurity,
      request: { params: mongoIdParams('id') },
    })
  )
}
