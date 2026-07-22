import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import app from '../../app/app.js'
import User from '../../model/User.js'
import { normalizeEmail } from '../../utils/normalizeEmail.js'
import { fetchCsrf, withCsrf } from '../helpers/csrf.js'

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  User@EXAMPLE.com ')).toBe('user@example.com')
  })

  it('returns empty string for nullish input', () => {
    expect(normalizeEmail(null)).toBe('')
    expect(normalizeEmail(undefined)).toBe('')
  })
})

describe('User email storage', () => {
  it('stores email in lowercase via schema setter', async () => {
    const user = await User.create({
      fullname: 'Case User',
      email: '  User@EXAMPLE.com ',
      password: 'hashed-password',
    })

    expect(user.email).toBe('user@example.com')

    const reloaded = await User.findById(user._id)
    expect(reloaded.email).toBe('user@example.com')

    const byMixedCase = await User.findOne({ email: normalizeEmail('USER@example.com') })
    expect(byMixedCase?._id.toString()).toBe(user._id.toString())
  })

  it('normalises mixed-case emails to one canonical value for lookups', async () => {
    const stamp = Date.now()
    const user = await User.create({
      fullname: 'First User',
      email: `Dup-${stamp}@Example.COM`,
      password: 'hashed-password',
    })

    expect(user.email).toBe(`dup-${stamp}@example.com`)

    const found = await User.findOne({
      email: normalizeEmail(`DUP-${stamp}@example.com`),
    })
    expect(found?._id.toString()).toBe(user._id.toString())
  })
})

describe('register and login email normalisation', () => {
  it('stores lowercase email and accepts mixed-case login', async () => {
    const stamp = Date.now()
    const mixedEmail = `User.Case-${stamp}@EXAMPLE.com`
    const password = 'secret123'
    const csrf = await fetchCsrf(app)

    const registerRes = await withCsrf(
      request(app).post('/shopai/users/register').send({
        fullname: 'Case Login User',
        email: mixedEmail,
        password,
        phone: '9876543210',
        country: 'India',
      }),
      csrf
    )
    expect(registerRes.status).toBe(201)
    expect(registerRes.body.data.email).toBe(mixedEmail.toLowerCase())

    const stored = await User.findOne({ email: mixedEmail.toLowerCase() })
    expect(stored).toBeTruthy()
    expect(stored.email).toBe(mixedEmail.toLowerCase())

    // Mark verified so login is allowed.
    stored.isEmailVerified = true
    await stored.save({ validateBeforeSave: false })

    const loginRes = await withCsrf(
      request(app).post('/shopai/users/login').send({
        email: `USER.CASE-${stamp}@example.COM`,
        password,
      }),
      csrf
    )
    expect(loginRes.status).toBe(200)

    const dupRegister = await withCsrf(
      request(app).post('/shopai/users/register').send({
        fullname: 'Duplicate Case User',
        email: `user.case-${stamp}@example.com`,
        password: 'otherpass99',
        phone: '9876543211',
        country: 'India',
      }),
      csrf
    )
    expect(dupRegister.status).toBe(409)
  })

  it('finds accounts for forgot-password regardless of email case', async () => {
    const stamp = Date.now()
    const email = `forgot-case-${stamp}@example.com`
    await User.create({
      fullname: 'Forgot Case User',
      email,
      password: await bcrypt.hash('secret123', 10),
    })

    const csrf = await fetchCsrf(app)
    const res = await withCsrf(
      request(app).post('/shopai/users/forgot-password').send({
        email: `Forgot-Case-${stamp}@EXAMPLE.COM`,
      }),
      csrf
    )
    expect(res.status).toBe(200)

    const reloaded = await User.findOne({ email })
    expect(reloaded.passwordResetOTP).toBeTruthy()
  })
})
