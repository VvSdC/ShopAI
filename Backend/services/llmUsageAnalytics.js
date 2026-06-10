import LlmUsageLog from '../model/LlmUsageLog.js'

function startDateForRange(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (Math.max(1, days) - 1))
  return d
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10)
}

export async function getChatUsageAnalytics({ days = 7, source = 'chat' } = {}) {
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
        avgLatencyMs: { $avg: '$latencyMs' },
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
        avgLatencyMs: { $avg: '$latencyMs' },
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
        avgLatencyMs: { $avg: '$latencyMs' },
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
        avgLatencyMs: { $avg: '$latencyMs' },
      },
    },
    { $sort: { totalTokens: -1 } },
  ])

  const dailyMap = new Map(daily.map((row) => [row._id, row]))
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

  const totals = totalsRow || {
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    avgLatencyMs: 0,
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
        calls: { $sum: 1 },
      },
    },
  ])

  const priorTokens = priorRow?.totalTokens || 0
  const tokenDeltaPct =
    priorTokens > 0
      ? Math.round(((totals.totalTokens - priorTokens) / priorTokens) * 100)
      : totals.totalTokens > 0
        ? 100
        : 0

  return {
    rangeDays,
    source: source || 'all',
    since: since.toISOString(),
    summary: {
      calls: totals.calls,
      promptTokens: totals.promptTokens,
      completionTokens: totals.completionTokens,
      totalTokens: totals.totalTokens,
      avgLatencyMs: Math.round(totals.avgLatencyMs || 0),
      successRate:
        totals.calls > 0
          ? Math.round((totals.successCount / totals.calls) * 100)
          : 100,
      tokenDeltaPct,
      avgTokensPerCall:
        totals.calls > 0 ? Math.round(totals.totalTokens / totals.calls) : 0,
    },
    daily: series,
    byRoute: byRoute.map((row) => ({
      route: row._id || 'unknown',
      calls: row.calls,
      totalTokens: row.totalTokens,
      avgLatencyMs: Math.round(row.avgLatencyMs || 0),
    })),
    byProvider: byProvider.map((row) => ({
      provider: row._id || 'unknown',
      calls: row.calls,
      totalTokens: row.totalTokens,
      avgLatencyMs: Math.round(row.avgLatencyMs || 0),
    })),
  }
}
