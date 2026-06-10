import LlmUsageLog from '../model/LlmUsageLog.js'
import { getLlmUsageContext } from './llmUsageContext.js'

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

export function recordLlmUsage({
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
}) {
  const ctx = getLlmUsageContext()
  const tokens = extractTokenUsage(responseData)

  const entry = {
    source: source || ctx.source || 'unknown',
    span: span || ctx.span || 'completion',
    userId: userId || ctx.userId || null,
    sessionId: sessionId || ctx.sessionId || null,
    route: route || ctx.route || null,
    provider: provider || 'unknown',
    model: model || null,
    promptTokens: tokens.promptTokens,
    completionTokens: tokens.completionTokens,
    totalTokens: tokens.totalTokens,
    latencyMs: latencyMs || 0,
    success,
  }

  LlmUsageLog.create(entry).catch((err) => {
    console.warn('[llmUsage] failed to persist usage log:', err.message)
  })
}
