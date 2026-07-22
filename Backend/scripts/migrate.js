import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { runPendingMigrations } from './run-migrations.js'

dotenv.config()

const migrations = [
  {
    name: '2026-07-07-example-noop',
    async run() {
      // Example placeholder — add real data migrations here.
    },
  },
]

async function main() {
  const mongoUrl = process.env.MONGO_URL
  if (!mongoUrl) {
    console.error('MONGO_URL is required')
    process.exit(1)
  }

  await mongoose.connect(mongoUrl)
  try {
    const result = await runPendingMigrations(migrations)
    console.log('Migrations finished:', result.ran)
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
