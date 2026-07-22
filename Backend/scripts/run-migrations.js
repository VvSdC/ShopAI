import mongoose from 'mongoose'
import logger from '../utils/logger.js'

const migrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    ranAt: { type: Date, default: Date.now },
  },
  { collection: 'migrations' }
)

const Migration =
  mongoose.models.Migration || mongoose.model('Migration', migrationSchema)

/**
 * Register migrations as { name, run } objects.
 * Each name runs at most once and is recorded in the migrations collection.
 */
export async function runPendingMigrations(migrations = []) {
  const pending = []

  for (const migration of migrations) {
    const exists = await Migration.findOne({ name: migration.name }).lean()
    if (!exists) pending.push(migration)
  }

  if (!pending.length) {
    logger.log('[migrations] No pending migrations')
    return { ran: [] }
  }

  const ran = []
  for (const migration of pending) {
    logger.log(`[migrations] Running ${migration.name}`)
    await migration.run()
    await Migration.create({ name: migration.name })
    ran.push(migration.name)
  }

  logger.log(`[migrations] Completed ${ran.length} migration(s)`)
  return { ran }
}

export { Migration }
