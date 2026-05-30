import mongoose from 'mongoose'

function formatMongoError(error) {
  const msg = error?.message || String(error)
  if (msg.includes('ECONNREFUSED') && msg.includes('27017')) {
    return [
      'MongoDB is not reachable at 127.0.0.1:27017.',
      'Start local MongoDB (e.g. run `mongod` or start the "MongoDB" Windows service),',
      'or set MONGO_URL in Backend/.env to your MongoDB Atlas connection string.',
    ].join(' ')
  }
  if (!process.env.MONGO_URL) {
    return 'MONGO_URL is missing. Copy Backend/.env.example to Backend/.env and set your database URL.'
  }
  return msg
}

const dbConnect = async () => {
  if (!process.env.MONGO_URL) {
    const message = formatMongoError(new Error('MONGO_URL not set'))
    console.error(`MongoDB: ${message}`)
    throw new Error(message)
  }

  try {
    mongoose.set('strictQuery', false)
    const connected = await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
    })
    console.log(`MongoDB connected: ${connected.connection.host}`)
    return connected
  } catch (error) {
    const message = formatMongoError(error)
    console.error(`MongoDB connection failed: ${message}`)
    throw new Error(message)
  }
}

export default dbConnect
