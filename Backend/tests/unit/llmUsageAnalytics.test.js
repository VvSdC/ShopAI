import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../model/LlmUsageSummary.js', () => ({
  default: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}))

vi.mock('../../model/LlmUsageLog.js', () => ({
  default: {
    aggregate: vi.fn(),
  },
}))

vi.mock('../../services/llmUsageSummaryService.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    countSummaryCoverage: vi.fn(),
    loadSummariesForRange: vi.fn(),
  }
})

import LlmUsageLog from '../../model/LlmUsageLog.js'
import {
  countSummaryCoverage,
  loadSummariesForRange,
  mergeBreakdown,
  mergeDailySummaries,
  listDateKeysBetween,
} from '../../services/llmUsageSummaryService.js'
import {
  getChatUsageAnalytics,
  getChatUsageAnalyticsFromSummary,
} from '../../services/llmUsageAnalytics.js'

describe('llmUsageSummaryService helpers', () => {
  it('lists inclusive UTC date keys', () => {
    expect(listDateKeysBetween('2026-05-28', '2026-05-30')).toEqual([
      '2026-05-28',
      '2026-05-29',
      '2026-05-30',
    ])
  })

  it('merges daily rows across sources', () => {
    const merged = mergeDailySummaries([
      {
        date: '2026-05-30',
        calls: 2,
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        latencySum: 100,
        successCount: 2,
      },
      {
        date: '2026-05-30',
        calls: 1,
        promptTokens: 5,
        completionTokens: 5,
        totalTokens: 10,
        latencySum: 50,
        successCount: 1,
      },
    ])

    expect(merged).toHaveLength(1)
    expect(merged[0].calls).toBe(3)
    expect(merged[0].totalTokens).toBe(40)
  })

  it('merges route breakdowns and computes avg latency', () => {
    const merged = mergeBreakdown(
      [
        [{ route: 'checkout', calls: 2, totalTokens: 100, latencySum: 200 }],
        [{ route: 'checkout', calls: 1, totalTokens: 50, latencySum: 150 }],
      ],
      'route'
    )

    expect(merged[0]).toEqual({
      route: 'checkout',
      calls: 3,
      totalTokens: 150,
      avgLatencyMs: 117,
    })
  })
})

describe('getChatUsageAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds analytics from pre-aggregated summaries', async () => {
    loadSummariesForRange.mockResolvedValueOnce([
      {
        date: '2026-05-30',
        source: 'chat',
        calls: 4,
        promptTokens: 40,
        completionTokens: 60,
        totalTokens: 100,
        latencySum: 400,
        successCount: 4,
        byRoute: [{ route: 'checkout', calls: 4, totalTokens: 100, latencySum: 400 }],
        byProvider: [{ provider: 'OpenRouter', calls: 4, totalTokens: 100, latencySum: 400 }],
      },
    ])
    loadSummariesForRange.mockResolvedValueOnce([])

    const result = await getChatUsageAnalyticsFromSummary({ days: 7, source: 'chat' })
    expect(result.dataSource).toBe('summary')
    expect(result.byRoute[0].route).toBe('checkout')
    expect(result.summary.totalTokens).toBeGreaterThanOrEqual(0)
  })

  it('prefers summary when coverage exists', async () => {
    countSummaryCoverage.mockResolvedValue({ expectedDays: 7, coveredDays: 2, ratio: 2 / 7 })
    loadSummariesForRange.mockResolvedValue([])

    const result = await getChatUsageAnalytics({ days: 7, source: 'chat' })
    expect(result.dataSource).toBe('summary')
    expect(LlmUsageLog.aggregate).not.toHaveBeenCalled()
  })

  it('falls back to raw logs when summaries are empty', async () => {
    countSummaryCoverage.mockResolvedValue({ expectedDays: 7, coveredDays: 0, ratio: 0 })
    LlmUsageLog.aggregate
      .mockResolvedValueOnce([
        {
          calls: 1,
          promptTokens: 1,
          completionTokens: 2,
          totalTokens: 3,
          latencySum: 10,
          successCount: 1,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getChatUsageAnalytics({ days: 7, source: 'chat' })
    expect(result.dataSource).toBe('raw')
    expect(result.summary.calls).toBe(1)
  })
})
