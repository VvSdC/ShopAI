import mongoose from 'mongoose'
import { config } from './env.js'
import logger from '../utils/logger.js'

function formatMongoError(error) {
  const msg = error?.message || String(error)
  if (msg.includes('ECONNREFUSED') && msg.includes('27017')) {
    return [
      'MongoDB is not reachable at 127.0.0.1:27017.',
      'Start local MongoDB, use Docker Compose (`docker compose up`),',
      'or set MONGO_URL in Backend/.env to your MongoDB Atlas connection string.',
    ].join(' ')
  }
  if (!config.db.mongoUrl) {
    return 'MONGO_URL is missing. Copy Backend/.env.example to Backend/.env and set your database URL.'
  }
  return msg
}

const dbConnect = async () => {
  if (!config.db.mongoUrl) {
    const message = formatMongoError(new Error('MONGO_URL not set'))
    logger.error(`MongoDB: ${message}`)
    throw new Error(message)
  }

  try {
    mongoose.set('strictQuery', false)
    const connected = await mongoose.connect(config.db.mongoUrl, {
      serverSelectionTimeoutMS: config.isTest ? 5000 : 10000,
    })
    logger.log(`MongoDB connected: ${connected.connection.host}`)
    return connected
  } catch (error) {
    const message = formatMongoError(error)
    logger.error(`MongoDB connection failed: ${message}`)
    throw new Error(message)
  }
}

export default dbConnect
