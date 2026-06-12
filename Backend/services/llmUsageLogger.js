import LlmUsageLog from '../model/LlmUsageLog.js'
import { config } from '../config/env.js'
import { getLlmUsageContext } from './llmUsageContext.js'
import { getRequestId } from '../utils/requestContext.js'
import logger from '../utils/logger.js'

const FLUSH_INTERVAL_MS = 5000
const FLUSH_BATCH_SIZE = 100

let buffer = []
let flushTimer = null
let flushing = false

export function extractTokenUsage(responseData) {
  const usage = responseData?.usage
  if (usage) {
    const promptTokens = usage.prompt_tokens ?? usage.input_tokens ?? 0
    const completionTokens = usage.completion_tokens ?? usage.output_tokens ?? 0
    const totalTokens =
      usage.total_tokens ?? promptTokens + completionTokens
    return { promptTokens, completionTokens, totalTokens }
  }

  const meta = responseData?.usageMetadata
  if (meta) {
    const promptTokens = meta.promptTokenCount ?? 0
    const completionTokens = meta.candidatesTokenCount ?? 0
    const totalTokens = meta.totalTokenCount ?? promptTokens + completionTokens
    return { promptTokens, completionTokens, totalTokens }
  }

  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
}

function buildUsageEntry({
  provider,
  model,
  responseData,
  latencyMs,
  success = true,
  span,
  source,
  userId,
  sessionId,
  route,
  routeReason,
}) {
  const ctx = getLlmUsageContext()
  const tokens = extractTokenUsage(responseData)

  return {
    source: source || ctx.source || 'unknown',
    span: span || ctx.span || 'completion',
    userId: userId || ctx.userId || null,
    sessionId: sessionId || ctx.sessionId || null,
    requestId: getRequestId() || ctx.requestId || null,
    route: route || ctx.route || null,
    routeReason: routeReason ?? ctx.routeReason ?? null,
    provider: provider || 'unknown',
    model: model || null,
    promptTokens: tokens.promptTokens,
    completionTokens: tokens.completionTokens,
    totalTokens: tokens.totalTokens,
    latencyMs: latencyMs || 0,
    success,
  }
}

function schedulePeriodicFlush() {
  if (flushTimer || config.isTest) return

  flushTimer = setInterval(() => {
    flushLlmUsageBuffer().catch((err) => {
      logger.warn('[llmUsage] periodic flush failed:', err.message)
    })
  }, FLUSH_INTERVAL_MS)

  if (typeof flushTimer.unref === 'function') {
    flushTimer.unref()
  }
}

export async function flushLlmUsageBuffer() {
  if (flushing || buffer.length === 0) return 0

  flushing = true
  const batch = buffer.splice(0, buffer.length)

  try {
    await LlmUsageLog.insertMany(batch, { ordered: false })
    return batch.length
  } catch (err) {
    logger.warn('[llmUsage] batch insert failed:', err.message)
    buffer.unshift(...batch)
    return 0
  } finally {
    flushing = false
    if (buffer.length >= FLUSH_BATCH_SIZE) {
      flushLlmUsageBuffer().catch((flushErr) => {
        logger.warn('[llmUsage] follow-up flush failed:', flushErr.message)
      })
    }
  }
}

export async function shutdownLlmUsageLogger() {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  await flushLlmUsageBuffer()
}

/** One row per chat request — route decision for classifier/heuristic evaluation. */
export function recordChatRouteDecision({ route, routeReason } = {}) {
  recordLlmUsage({
    provider: 'router',
    model: null,
    responseData: null,
    latencyMs: 0,
    span: 'route-decision',
    route: route || null,
    routeReason: routeReason || null,
  })
}

export function recordLlmUsage(params) {
  const entry = buildUsageEntry(params)

  if (config.isTest) {
    LlmUsageLog.create(entry).catch((err) => {
      logger.warn('[llmUsage] failed to persist usage log:', err.message)
    })
    return
  }

  buffer.push(entry)
  schedulePeriodicFlush()

  if (buffer.length >= FLUSH_BATCH_SIZE) {
    flushLlmUsageBuffer().catch((err) => {
      logger.warn('[llmUsage] size-triggered flush failed:', err.message)
    })
  }
}
