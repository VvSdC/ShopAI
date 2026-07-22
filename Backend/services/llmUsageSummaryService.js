import LlmUsageLog from '../model/LlmUsageLog.js'
import LlmUsageSummary from '../model/LlmUsageSummary.js'
import logger from '../utils/logger.js'

export const LLM_USAGE_SOURCES = [
  'chat',
  'eval',
  'inference_test',
  'background',
  'chat_tool',
  'unknown',
]

export function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10)
}

export function utcDayBounds(dateKeyStr) {
  const start = new Date(`${dateKeyStr}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

export function listDateKeysBetween(startKey, endKey) {
  const keys = []
  const cursor = new Date(`${startKey}T00:00:00.000Z`)
  const end = new Date(`${endKey}T00:00:00.000Z`)

  while (cursor <= end) {
    keys.push(dateKey(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return keys
}

function mapRouteRows(rows) {
  return rows.map((row) => ({
    route: row._id || 'unknown',
    calls: row.calls,
    totalTokens: row.totalTokens,
    latencySum: row.latencySum,
    costUsd: row.costUsd || 0,
  }))
}

function mapProviderRows(rows) {
  return rows.map((row) => ({
    provider: row._id || 'unknown',
    calls: row.calls,
    totalTokens: row.totalTokens,
    latencySum: row.latencySum,
    costUsd: row.costUsd || 0,
    errorCount: row.errorCount || 0,
  }))
}

function mapSpanRows(rows) {
  return rows.map((row) => ({
    span: row._id || 'unknown',
    calls: row.calls,
    totalTokens: row.totalTokens,
    latencySum: row.latencySum,
    costUsd: row.costUsd || 0,
  }))
}

function mapToolRows(rows) {
  return rows
    .filter((row) => row._id)
    .map((row) => ({
      tool: row._id,
      calls: row.calls,
      latencySum: row.latencySum,
      errorCount: row.errorCount || 0,
    }))
}

function mapErrorRows(rows) {
  return rows
    .filter((row) => row._id)
    .map((row) => ({ errorType: row._id, count: row.count }))
}

/** Aggregate one UTC day + source from raw logs into LlmUsageSummary. */
export async function aggregateLlmUsageForDay(dayKey, source) {
  const { start, end } = utcDayBounds(dayKey)
  const match = {
    createdAt: { $gte: start, $lt: end },
    source,
  }

  const [totalsRow] = await LlmUsageLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        calls: { $sum: 1 },
        promptTokens: { $sum: '$promptTokens' },
        completionTokens: { $sum: '$completionTokens' },
        totalTokens: { $sum: '$totalTokens' },
        latencySum: { $sum: '$latencyMs' },
        successCount: { $sum: { $cond: ['$success', 1, 0] } },
        errorCount: { $sum: { $cond: ['$success', 0, 1] } },
        costUsd: { $sum: '$costUsd' },
      },
    },
  ])

  const byRoute = await LlmUsageLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$route',
        calls: { $sum: 1 },
        totalTokens: { $sum: '$totalTokens' },
        latencySum: { $sum: '$latencyMs' },
        costUsd: { $sum: '$costUsd' },
      },
    },
  ])

  const byProvider = await LlmUsageLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$provider',
        calls: { $sum: 1 },
        totalTokens: { $sum: '$totalTokens' },
        latencySum: { $sum: '$latencyMs' },
        costUsd: { $sum: '$costUsd' },
        errorCount: { $sum: { $cond: ['$success', 0, 1] } },
      },
    },
  ])

  const bySpan = await LlmUsageLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$span',
        calls: { $sum: 1 },
        totalTokens: { $sum: '$totalTokens' },
        latencySum: { $sum: '$latencyMs' },
        costUsd: { $sum: '$costUsd' },
      },
    },
  ])

  const byTool = await LlmUsageLog.aggregate([
    { $match: { ...match, tool: { $ne: null } } },
    {
      $group: {
        _id: '$tool',
        calls: { $sum: 1 },
        latencySum: { $sum: '$latencyMs' },
        errorCount: { $sum: { $cond: ['$success', 0, 1] } },
      },
    },
  ])

  const byError = await LlmUsageLog.aggregate([
    { $match: { ...match, success: false, errorType: { $ne: null } } },
    {
      $group: {
        _id: '$errorType',
        count: { $sum: 1 },
      },
    },
  ])

  const totals = totalsRow || {
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    latencySum: 0,
    successCount: 0,
    errorCount: 0,
    costUsd: 0,
  }

  await LlmUsageSummary.findOneAndUpdate(
    { date: dayKey, source },
    {
      date: dayKey,
      source,
      calls: totals.calls,
      promptTokens: totals.promptTokens,
      completionTokens: totals.completionTokens,
      totalTokens: totals.totalTokens,
      latencySum: totals.latencySum,
      successCount: totals.successCount,
      errorCount: totals.errorCount || 0,
      costUsd: totals.costUsd || 0,
      byRoute: mapRouteRows(byRoute),
      byProvider: mapProviderRows(byProvider),
      bySpan: mapSpanRows(bySpan),
      byTool: mapToolRows(byTool),
      byError: mapErrorRows(byError),
      aggregatedAt: new Date(),
    },
    { upsert: true, new: true }
  )

  return { dayKey, source, calls: totals.calls }
}

export async function aggregateLlmUsageForDateKeys(dateKeys, sources = LLM_USAGE_SOURCES) {
  let updated = 0

  for (const dayKey of dateKeys) {
    for (const source of sources) {
      const result = await aggregateLlmUsageForDay(dayKey, source)
      if (result.calls > 0) updated += 1
    }
  }

  return { days: dateKeys.length, updated }
}

/** Backfill recent days — today/yesterday refreshed hourly; older days reconciled on deploy. */
export async function runLlmUsageSummaryAggregation({ backfillDays = 2 } = {}) {
  const safeDays = Math.min(Math.max(parseInt(backfillDays, 10) || 2, 1), 90)
  const today = dateKey(new Date())
  const start = new Date(`${today}T00:00:00.000Z`)
  start.setUTCDate(start.getUTCDate() - (safeDays - 1))
  const dateKeys = listDateKeysBetween(dateKey(start), today)

  logger.log(`[llmUsageSummary] Aggregating ${dateKeys.length} day(s) × ${LLM_USAGE_SOURCES.length} sources`)
  const result = await aggregateLlmUsageForDateKeys(dateKeys)
  logger.log(`[llmUsageSummary] Aggregation complete (${result.updated} non-empty day/source rows)`)
  return result
}

function emptyTotals() {
  return {
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    latencySum: 0,
    successCount: 0,
    errorCount: 0,
    costUsd: 0,
  }
}

function addTotals(target, row) {
  target.calls += row.calls || 0
  target.promptTokens += row.promptTokens || 0
  target.completionTokens += row.completionTokens || 0
  target.totalTokens += row.totalTokens || 0
  target.latencySum += row.latencySum || 0
  target.successCount += row.successCount || 0
  target.errorCount += row.errorCount || 0
  target.costUsd += row.costUsd || 0
}

export function mergeDailySummaries(rows) {
  const byDate = new Map()

  for (const row of rows) {
    const current = byDate.get(row.date) || { ...emptyTotals(), date: row.date }
    addTotals(current, row)
    byDate.set(row.date, current)
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function mergeBreakdown(rows, field) {
  const map = new Map()

  for (const row of rows) {
    for (const item of row || []) {
      const key = item[field] || 'unknown'
      const prev = map.get(key) || {
        [field]: key,
        calls: 0,
        totalTokens: 0,
        latencySum: 0,
        costUsd: 0,
        errorCount: 0,
      }
      prev.calls += item.calls || 0
      prev.totalTokens += item.totalTokens || 0
      prev.latencySum += item.latencySum || 0
      prev.costUsd += item.costUsd || 0
      prev.errorCount += item.errorCount || 0
      map.set(key, prev)
    }
  }

  return [...map.values()]
    .sort((a, b) => b.totalTokens - a.totalTokens || b.calls - a.calls)
    .map((row) => ({
      [field]: row[field],
      calls: row.calls,
      totalTokens: row.totalTokens,
      costUsd: Number(row.costUsd.toFixed(6)),
      errorCount: row.errorCount,
      avgLatencyMs: row.calls > 0 ? Math.round(row.latencySum / row.calls) : 0,
    }))
}

/** Merge tool breakdowns across dates (tools have no tokens/cost). */
export function mergeToolBreakdown(rows) {
  const map = new Map()
  for (const row of rows) {
    for (const item of row || []) {
      const key = item.tool || 'unknown'
      const prev = map.get(key) || { tool: key, calls: 0, latencySum: 0, errorCount: 0 }
      prev.calls += item.calls || 0
      prev.latencySum += item.latencySum || 0
      prev.errorCount += item.errorCount || 0
      map.set(key, prev)
    }
  }
  return [...map.values()]
    .sort((a, b) => b.calls - a.calls)
    .map((row) => ({
      tool: row.tool,
      calls: row.calls,
      errorCount: row.errorCount,
      avgLatencyMs: row.calls > 0 ? Math.round(row.latencySum / row.calls) : 0,
      errorRate: row.calls > 0 ? Math.round((row.errorCount / row.calls) * 100) : 0,
    }))
}

/** Merge error-type breakdowns across dates. */
export function mergeErrorBreakdown(rows) {
  const map = new Map()
  for (const row of rows) {
    for (const item of row || []) {
      const key = item.errorType || 'unknown'
      map.set(key, (map.get(key) || 0) + (item.count || 0))
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([errorType, count]) => ({ errorType, count }))
}

export async function loadSummariesForRange({ startKey, endKey, source }) {
  const filter = {
    date: { $gte: startKey, $lte: endKey },
  }
  if (source && source !== 'all') {
    filter.source = source
  }

  return LlmUsageSummary.find(filter).sort({ date: 1 }).lean()
}

export async function countSummaryCoverage({ startKey, endKey, source }) {
  const expectedDays = listDateKeysBetween(startKey, endKey).length
  if (expectedDays === 0) return { expectedDays: 0, coveredDays: 0, ratio: 0 }

  if (source && source !== 'all') {
    const coveredDays = await LlmUsageSummary.countDocuments({
      date: { $gte: startKey, $lte: endKey },
      source,
    })
    return { expectedDays, coveredDays, ratio: coveredDays / expectedDays }
  }

  const grouped = await LlmUsageSummary.aggregate([
    {
      $match: {
        date: { $gte: startKey, $lte: endKey },
      },
    },
    { $group: { _id: '$date' } },
    { $count: 'days' },
  ])

  const coveredDays = grouped[0]?.days || 0
  return { expectedDays, coveredDays, ratio: coveredDays / expectedDays }
}
