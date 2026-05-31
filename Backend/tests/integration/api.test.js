import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../app/app.js'

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.env).toBe('test')
  })
})

describe('GET /shopai/policy', () => {
  it('returns public store policy', async () => {
    const res = await request(app).get('/shopai/policy/')
    expect(res.status).toBe(200)
    expect(res.body.policy).toBeDefined()
    expect(res.body.policy.returns.windowDays).toBe(3)
  })
})
