/**
 * Backfill LlmUsageSummary from raw LlmUsageLog (manual / deploy migration).
 *
 * Usage: npm run analytics:backfill-usage
 *        node scripts/backfill-llm-usage-summary.js [days]
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { config } from '../config/env.js'
import { runLlmUsageSummaryAggregation } from '../services/llmUsageSummaryService.js'
import logger from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const daysArg = parseInt(process.argv[2], 10)
const backfillDays = Number.isNaN(daysArg)
  ? config.analytics.llmUsageSummaryBackfillDays
  : Math.min(Math.max(daysArg, 1), 90)

await mongoose.connect(config.db.mongoUrl)
logger.log(`Backfilling LLM usage summaries for the last ${backfillDays} day(s)...`)

const result = await runLlmUsageSummaryAggregation({ backfillDays })
logger.log(`Done: ${result.updated} non-empty day/source rows across ${result.days} day(s)`)

await mongoose.disconnect()
