import { MongoMemoryServer } from 'mongodb-memory-server'

let mongod

export async function setup() {
  mongod = await MongoMemoryServer.create()
  process.env.MONGO_URL = mongod.getUri()
  process.env.NODE_ENV = 'test'
  process.env.JWT_KEY = 'test-jwt-secret-min-32-characters-long'
  process.env.JWT_REFRESH_KEY = 'test-refresh-secret-min-32-chars-long'
  process.env.STRIPE_KEY = 'sk_test_placeholder'
  process.env.FRONTEND_URL = 'http://localhost:3000'
}

export async function teardown() {
  if (mongod) {
    await mongod.stop()
  }
}
