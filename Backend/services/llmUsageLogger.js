import LlmUsageLog from '../model/LlmUsageLog.js'
import { config } from '../config/env.js'
import { getLlmUsageContext } from './llmUsageContext.js'
import { getRequestId } from '../utils/requestContext.js'
import logger from '../utils/logger.js'
import { estimateLlmCostUsd } from './llmPricing.js'

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

/** Best-effort classification of provider errors — used for dashboard grouping. */
export function classifyLlmError(err) {
  if (!err) return null
  const message = String(err.message || err).toLowerCase()
  if (err.isRateLimit || message.includes('rate limit')) return 'rate_limit'
  if (message.includes('timeout') || message.includes('etimedout')) return 'timeout'
  if (message.includes('401') || message.includes('unauthorized') || message.includes('api key')) return 'auth'
  if (message.includes('402') || message.includes('quota') || message.includes('credit')) return 'quota'
  if (message.includes('404') || message.includes('model') && message.includes('not')) return 'model_missing'
  if (message.includes('5') && message.match(/\b5\d\d\b/)) return 'provider_5xx'
  if (message.includes('network') || message.includes('econnrefused') || message.includes('fetch failed')) return 'network'
  if (message.includes('invalid') || message.includes('parse')) return 'invalid_response'
  return 'api_error'
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
  errorType,
  errorMessage,
  tool,
  toolSuccess,
  promptTokens: promptTokensOverride,
  completionTokens: completionTokensOverride,
  totalTokens: totalTokensOverride,
  costUsd: costOverride,
}) {
  const ctx = getLlmUsageContext()
  const tokens = extractTokenUsage(responseData)
  const promptTokens = promptTokensOverride ?? tokens.promptTokens
  const completionTokens = completionTokensOverride ?? tokens.completionTokens
  const totalTokens = totalTokensOverride ?? tokens.totalTokens

  const resolvedProvider = provider || 'unknown'
  const resolvedModel = model || null
  const costUsd =
    costOverride ??
    estimateLlmCostUsd({
      provider: resolvedProvider,
      model: resolvedModel,
      promptTokens,
      completionTokens,
    })

  return {
    source: source || ctx.source || 'unknown',
    span: span || ctx.span || 'completion',
    userId: userId || ctx.userId || null,
    sessionId: sessionId || ctx.sessionId || null,
    requestId: getRequestId() || ctx.requestId || null,
    route: route || ctx.route || null,
    routeReason: routeReason ?? ctx.routeReason ?? null,
    provider: resolvedProvider,
    model: resolvedModel,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
    latencyMs: latencyMs || 0,
    success,
    errorType: errorType || null,
    errorMessage: errorMessage || null,
    tool: tool || null,
    toolSuccess: toolSuccess ?? null,
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

/**
 * Chat tool call telemetry — one row per tool invocation.
 * Zero tokens by design; latency + success drive tool dashboards.
 */
export function recordChatToolUsage({
  toolName,
  latencyMs = 0,
  success = true,
  errorType = null,
  errorMessage = null,
  route = null,
} = {}) {
  if (!toolName) return
  recordLlmUsage({
    provider: 'tool',
    model: null,
    responseData: null,
    latencyMs,
    span: 'tool',
    source: 'chat_tool',
    tool: toolName,
    toolSuccess: success,
    success,
    errorType,
    errorMessage,
    route,
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
