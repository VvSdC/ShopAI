import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../app/app.js'

describe('GET /shopai/reviews/admin/all', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/shopai/reviews/admin/all')
    expect(res.status).toBe(401)
  })
})

describe('GET /health details', () => {
  it('includes mongo check field', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('mongo')
  })
})
