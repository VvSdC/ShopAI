import LlmUsageLog from '../model/LlmUsageLog.js'
import {
  countSummaryCoverage,
  dateKey,
  listDateKeysBetween,
  loadSummariesForRange,
  mergeBreakdown,
  mergeDailySummaries,
} from './llmUsageSummaryService.js'

function startDateForRange(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (Math.max(1, days) - 1))
  return d
}

function buildDailySeries(since, rangeDays, dailyMap) {
  const series = []
  for (let i = 0; i < rangeDays; i++) {
    const day = new Date(since)
    day.setDate(since.getDate() + i)
    const key = dateKey(day)
    const row = dailyMap.get(key)
    series.push({
      date: key,
      calls: row?.calls || 0,
      promptTokens: row?.promptTokens || 0,
      completionTokens: row?.completionTokens || 0,
      totalTokens: row?.totalTokens || 0,
      avgLatencyMs: Math.round(row?.avgLatencyMs || 0),
    })
  }
  return series
}

function buildSummaryBlock(totals, priorTokens) {
  const tokenDeltaPct =
    priorTokens > 0
      ? Math.round(((totals.totalTokens - priorTokens) / priorTokens) * 100)
      : totals.totalTokens > 0
        ? 100
        : 0

  return {
    calls: totals.calls,
    promptTokens: totals.promptTokens,
    completionTokens: totals.completionTokens,
    totalTokens: totals.totalTokens,
    avgLatencyMs:
      totals.calls > 0 ? Math.round(totals.latencySum / totals.calls) : 0,
    successRate:
      totals.calls > 0
        ? Math.round((totals.successCount / totals.calls) * 100)
        : 100,
    tokenDeltaPct,
    avgTokensPerCall:
      totals.calls > 0 ? Math.round(totals.totalTokens / totals.calls) : 0,
  }
}

export async function getChatUsageAnalyticsFromSummary({ days = 7, source = 'chat' } = {}) {
  const rangeDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 90)
  const since = startDateForRange(rangeDays)
  const endKey = dateKey(new Date())
  const startKey = dateKey(since)

  const rows = await loadSummariesForRange({ startKey, endKey, source })
  const dailyRows = mergeDailySummaries(rows)
  const dailyMap = new Map(
    dailyRows.map((row) => [
      row.date,
      {
        ...row,
        avgLatencyMs: row.calls > 0 ? row.latencySum / row.calls : 0,
      },
    ])
  )

  const totals = dailyRows.reduce(
    (acc, row) => {
      acc.calls += row.calls
      acc.promptTokens += row.promptTokens
      acc.completionTokens += row.completionTokens
      acc.totalTokens += row.totalTokens
      acc.latencySum += row.latencySum
      acc.successCount += row.successCount
      return acc
    },
    {
      calls: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencySum: 0,
      successCount: 0,
    }
  )

  const priorSince = new Date(since)
  priorSince.setDate(priorSince.getDate() - rangeDays)
  const priorRows = await loadSummariesForRange({
    startKey: dateKey(priorSince),
    endKey: dateKey(new Date(since.getTime() - 86400000)),
    source,
  })
  const priorTokens = mergeDailySummaries(priorRows).reduce(
    (sum, row) => sum + row.totalTokens,
    0
  )

  const byRoute = mergeBreakdown(
    rows.map((row) => row.byRoute),
    'route'
  ).slice(0, 10)
  const byProvider = mergeBreakdown(
    rows.map((row) => row.byProvider),
    'provider'
  )

  return {
    rangeDays,
    source: source || 'all',
    since: since.toISOString(),
    dataSource: 'summary',
    summary: buildSummaryBlock(totals, priorTokens),
    daily: buildDailySeries(since, rangeDays, dailyMap),
    byRoute: byRoute.map((row) => ({
      route: row.route,
      calls: row.calls,
      totalTokens: row.totalTokens,
      avgLatencyMs: row.avgLatencyMs,
    })),
    byProvider: byProvider.map((row) => ({
      provider: row.provider,
      calls: row.calls,
      totalTokens: row.totalTokens,
      avgLatencyMs: row.avgLatencyMs,
    })),
  }
}

export async function getChatUsageAnalyticsFromRaw({ days = 7, source = 'chat' } = {}) {
  const rangeDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 90)
  const since = startDateForRange(rangeDays)

  const match = { createdAt: { $gte: since } }
  if (source && source !== 'all') {
    match.source = source
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
        successCount: {
          $sum: { $cond: ['$success', 1, 0] },
        },
      },
    },
  ])

  const daily = await LlmUsageLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        calls: { $sum: 1 },
        promptTokens: { $sum: '$promptTokens' },
        completionTokens: { $sum: '$completionTokens' },
        totalTokens: { $sum: '$totalTokens' },
        latencySum: { $sum: '$latencyMs' },
      },
    },
    { $sort: { _id: 1 } },
  ])

  const byRoute = await LlmUsageLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$route',
        calls: { $sum: 1 },
        totalTokens: { $sum: '$totalTokens' },
        latencySum: { $sum: '$latencyMs' },
      },
    },
    { $sort: { totalTokens: -1 } },
    { $limit: 10 },
  ])

  const byProvider = await LlmUsageLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$provider',
        calls: { $sum: 1 },
        totalTokens: { $sum: '$totalTokens' },
        latencySum: { $sum: '$latencyMs' },
      },
    },
    { $sort: { totalTokens: -1 } },
  ])

  const dailyMap = new Map(
    daily.map((row) => [
      row._id,
      {
        calls: row.calls,
        promptTokens: row.promptTokens,
        completionTokens: row.completionTokens,
        totalTokens: row.totalTokens,
        avgLatencyMs: row.calls > 0 ? row.latencySum / row.calls : 0,
      },
    ])
  )

  const totals = totalsRow || {
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    latencySum: 0,
    successCount: 0,
  }

  const priorSince = new Date(since)
  priorSince.setDate(priorSince.getDate() - rangeDays)
  const [priorRow] = await LlmUsageLog.aggregate([
    {
      $match: {
        ...match,
        createdAt: { $gte: priorSince, $lt: since },
      },
    },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: '$totalTokens' },
      },
    },
  ])

  return {
    rangeDays,
    source: source || 'all',
    since: since.toISOString(),
    dataSource: 'raw',
    summary: buildSummaryBlock(totals, priorRow?.totalTokens || 0),
    daily: buildDailySeries(since, rangeDays, dailyMap),
    byRoute: byRoute.map((row) => ({
      route: row._id || 'unknown',
      calls: row.calls,
      totalTokens: row.totalTokens,
      avgLatencyMs: row.calls > 0 ? Math.round(row.latencySum / row.calls) : 0,
    })),
    byProvider: byProvider.map((row) => ({
      provider: row._id || 'unknown',
      calls: row.calls,
      totalTokens: row.totalTokens,
      avgLatencyMs: row.calls > 0 ? Math.round(row.latencySum / row.calls) : 0,
    })),
  }
}

export async function getChatUsageAnalytics({ days = 7, source = 'chat' } = {}) {
  const rangeDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 90)
  const since = startDateForRange(rangeDays)
  const coverage = await countSummaryCoverage({
    startKey: dateKey(since),
    endKey: dateKey(new Date()),
    source,
  })

  if (coverage.coveredDays > 0) {
    const result = await getChatUsageAnalyticsFromSummary({ days, source })
    return { ...result, degraded: false }
  }

  const result = await getChatUsageAnalyticsFromRaw({ days, source })
  return { ...result, degraded: true, degradedReason: 'summary_worker_unavailable' }
}

export { listDateKeysBetween, dateKey, startDateForRange }
