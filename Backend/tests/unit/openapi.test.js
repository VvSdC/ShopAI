import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../app/app.js'
import { buildOpenApiDocument } from '../../openapi/index.js'
import { config } from '../../config/env.js'

describe('OpenAPI document', () => {
  it('generates a valid OpenAPI 3 document with expected paths', () => {
    const doc = buildOpenApiDocument({ serverUrl: 'http://localhost:2030' })

    expect(doc.openapi).toMatch(/^3\.0/)
    expect(doc.info.title).toBe('ShopAI API')
    expect(doc.components?.securitySchemes?.cookieAuth).toBeDefined()
    expect(doc.components?.securitySchemes?.bearerAuth).toBeDefined()
    expect(doc.components?.schemas?.LoginBody).toBeDefined()
    expect(doc.components?.schemas?.CreateOrderBody).toBeDefined()

    const paths = Object.keys(doc.paths || {})
    expect(paths.length).toBeGreaterThanOrEqual(50)
    expect(paths).toContain('/shopai/users/login')
    expect(paths).toContain('/shopai/cart/items')
    expect(paths).toContain('/shopai/chat/message')
    expect(paths).toContain('/health')
  })
})

describe('OpenAPI HTTP routes', () => {
  it('serves openapi.json when enabled', async () => {
    if (!config.openapi.enabled) {
      return
    }

    const res = await request(app).get('/shopai/openapi.json')
    expect(res.status).toBe(200)
    expect(res.body.openapi).toMatch(/^3\.0/)
    expect(res.body.paths['/shopai/products/']).toBeDefined()
  })

  it('serves Swagger UI when enabled', async () => {
    if (!config.openapi.enabled) {
      return
    }

    const res = await request(app).get('/shopai/docs/')
    expect(res.status).toBe(200)
    expect(res.text).toMatch(/swagger/i)
  })
})
