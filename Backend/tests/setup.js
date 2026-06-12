import mongoose from 'mongoose'
import { beforeAll, afterAll } from 'vitest'
import config from '../config/env.js'

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.db.mongoUrl, {
      serverSelectionTimeoutMS: 10000,
    })
  }
})

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
})
