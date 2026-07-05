import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../app/app.js'
import User from '../../model/User.js'
import { generateAccessToken } from '../../utils/generateToken.js'

describe('GET /shopai/users/all', () => {
  it('paginates users with cursor-based pagination', async () => {
    const admin = await User.create({
      fullname: 'Admin Lister',
      email: `admin-lister-${Date.now()}@test.com`,
      password: 'hashed',
      isAdmin: true,
      isEmailVerified: true,
    })

    const stamp = Date.now()
    for (let i = 0; i < 3; i++) {
      await User.create({
        fullname: `Customer ${i}`,
        email: `customer-${stamp}-${i}@test.com`,
        password: 'hashed',
        isEmailVerified: true,
      })
    }

    const token = generateAccessToken(admin)
    const page1 = await request(app)
      .get('/shopai/users/all')
      .query({ limit: 2 })
      .set('Authorization', `Bearer ${token}`)

    expect(page1.status).toBe(200)
    expect(page1.body.users).toHaveLength(2)
    expect(page1.body.pagination).toMatchObject({
      limit: 2,
      hasMore: true,
      nextCursor: expect.any(String),
    })
    expect(page1.body.pagination.total).toBeGreaterThanOrEqual(4)

    const page2 = await request(app)
      .get('/shopai/users/all')
      .query({ limit: 2, cursor: page1.body.pagination.nextCursor })
      .set('Authorization', `Bearer ${token}`)

    expect(page2.status).toBe(200)
    expect(page2.body.users.length).toBeGreaterThan(0)

    const idsPage1 = page1.body.users.map((u) => String(u._id))
    const idsPage2 = page2.body.users.map((u) => String(u._id))
    expect(idsPage1.some((id) => idsPage2.includes(id))).toBe(false)
  })

  it('rejects an invalid cursor', async () => {
    const admin = await User.create({
      fullname: 'Admin Cursor',
      email: `admin-cursor-${Date.now()}@test.com`,
      password: 'hashed',
      isAdmin: true,
      isEmailVerified: true,
    })

    const token = generateAccessToken(admin)
    const res = await request(app)
      .get('/shopai/users/all')
      .query({ cursor: 'not-a-cursor' })
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/cursor/i)
  })
})
