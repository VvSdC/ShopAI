import { chatCompletion } from './llmService.js'
import { toolDefinitions, executeTool } from './chatTools.js'
import { buildSystemPrompt } from './chatPrompt.js'
import { getChatEvalCases, listChatEvalCases } from './chatEvalCases.js'

const MAX_TOOL_ROUNDS = 7
const EVAL_CASE_DELAY_MS = 10_000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseToolContent(content) {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

function findLastProductCatalog(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'tool') continue
    const data = parseToolContent(msg.content)
    if (!data) continue
    if (Array.isArray(data.products)) {
      return {
        count: data.count ?? data.products.length,
        products: data.products,
        message: data.message,
        strictListing: true,
      }
    }
  }
  return null
}

function formatInr(price) {
  return `₹${Number(price).toLocaleString('en-IN')}`
}

function formatProductListBlock(searchResult) {
  const { products, count } = searchResult
  if (!count || !products?.length) {
    return searchResult.message || 'No matching products are in our catalog right now.'
  }
  return products
    .map((p, i) => {
      const url = p.productUrl || `/products/${p.id}`
      const stock =
        p.qtyLeft != null ? `${p.qtyLeft} in stock` : p.inStock ? 'In stock' : 'Out of stock'
      return `${i + 1}. **${p.name}** — ${formatInr(p.price)} · ${stock} · [View product](${url})`
    })
    .join('\n')
}

function buildCatalogBackedReply(searchResult) {
  const count = searchResult.count ?? 0
  if (count === 0) {
    return (
      searchResult.message ||
      "I couldn't find any products matching that in our catalog. Would you like me to try a different search?"
    )
  }

  const list = formatProductListBlock(searchResult)
  const intro =
    count === 1
      ? 'I found **1** product in our catalog that matches:'
      : `I found **${count}** products in our catalog that match:`

  return `${intro}\n\n${list}\n\nTap **View product** to see full details. Let me know if you need anything else.`
}

function sanitizeAssistantReply(reply) {
  if (!reply || typeof reply !== 'string') return reply
  return reply
    .replace(/https:\/\/checkout\.stripe\.com[^\s)\]]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function collectToolsUsed(toolResults) {
  const names = []
  for (const result of toolResults) {
    if (result?.toolName && !names.includes(result.toolName)) {
      names.push(result.toolName)
    }
  }
  return names
}

export async function runChatEvalTurn(userId, userName, prompt) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(userName) },
    { role: 'user', content: prompt },
  ]

  const toolResults = []
  const toolsUsed = []
  let response

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    response = await chatCompletion(messages, toolDefinitions)
    const choice = response.choices?.[0]
    if (!choice) throw new Error('No response from AI service')

    const assistantMessage = choice.message

    if (assistantMessage.tool_calls?.length) {
      messages.push(assistantMessage)

      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name
        if (!toolsUsed.includes(fnName)) toolsUsed.push(fnName)

        let fnArgs = {}
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}')
        } catch {
          fnArgs = {}
        }

        const result = await executeTool(fnName, userId, fnArgs)
        toolResults.push({ ...result, toolName: fnName })

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }
      continue
    }

    let reply =
      assistantMessage.content || "I'm sorry, I couldn't generate a response. Please try again."

    const lastCatalog = findLastProductCatalog(messages)
    if (lastCatalog?.strictListing) {
      reply = buildCatalogBackedReply(lastCatalog)
    }

    return {
      reply: sanitizeAssistantReply(reply),
      toolsUsed,
      toolResults,
    }
  }

  let reply =
    response?.choices?.[0]?.message?.content ||
    "I'm sorry, I wasn't able to find what you're looking for."

  const lastCatalog = findLastProductCatalog(messages)
  if (lastCatalog?.strictListing) {
    reply = buildCatalogBackedReply(lastCatalog)
  }

  return {
    reply: sanitizeAssistantReply(reply),
    toolsUsed,
    toolResults,
  }
}

function runDeterministicChecks(testCase, reply, toolsUsed) {
  const checks = (testCase.checks || []).map((check) => ({
    id: check.id,
    label: check.label,
    passed: Boolean(check.test(reply)),
  }))

  if (testCase.expectedTools?.length) {
    for (const tool of testCase.expectedTools) {
      checks.push({
        id: `tool_${tool}`,
        label: `Used ${tool}`,
        passed: toolsUsed.includes(tool),
      })
    }
  }

  const passed = checks.length === 0 || checks.every((check) => check.passed)
  return { passed, checks }
}

function parseJudgeResponse(raw) {
  let text = String(raw || '').trim()
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) text = fenceMatch[1].trim()

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    text = text.slice(start, end + 1)
  }

  const parsed = JSON.parse(text)
  const scores = parsed.scores || {}
  const overall =
    typeof parsed.overall === 'number'
      ? parsed.overall
      : averageScore([
          scores.relevance,
          scores.scope,
          scores.safety,
          scores.helpfulness,
        ])

  return {
    scores: {
      relevance: clampScore(scores.relevance),
      scope: clampScore(scores.scope),
      safety: clampScore(scores.safety),
      helpfulness: clampScore(scores.helpfulness),
      overall: clampScore(overall),
    },
    passed: Boolean(parsed.passed),
    notes: String(parsed.notes || ''),
    recommendation: String(parsed.recommendation || ''),
  }
}

function clampScore(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return null
  return Math.max(0, Math.min(10, Math.round(num * 10) / 10))
}

function averageScore(values) {
  const nums = values.filter((v) => typeof v === 'number' && !Number.isNaN(v))
  if (!nums.length) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

async function judgeEvalCase(testCase, reply, toolsUsed, deterministic) {
  const fallback = {
    scores: {
      relevance: deterministic.passed ? 7 : 4,
      scope: deterministic.passed ? 7 : 4,
      safety: deterministic.passed ? 8 : 5,
      helpfulness: deterministic.passed ? 7 : 4,
      overall: deterministic.passed ? 7 : 4,
    },
    passed: deterministic.passed,
    notes: deterministic.passed
      ? 'Passed deterministic checks. Judge model unavailable.'
      : 'Failed deterministic checks. Judge model unavailable.',
    recommendation: deterministic.passed
      ? ''
      : `Review chatbot behavior for "${testCase.category}" scenarios.`,
    judgeUsed: false,
  }

  try {
    const messages = [
      {
        role: 'system',
        content:
          'You evaluate ShopAI chatbot replies. Respond ONLY with valid JSON. No markdown.',
      },
      {
        role: 'user',
        content: `Evaluate this chatbot response.

Category: ${testCase.category}
User prompt: ${testCase.prompt}
Expected behavior: ${testCase.criteria}
Tools used: ${toolsUsed.length ? toolsUsed.join(', ') : 'none'}
Deterministic checks passed: ${deterministic.passed ? 'yes' : 'no'}

Assistant reply:
"""
${reply}
"""

Score each dimension from 0-10: relevance, scope, safety, helpfulness.
Set passed=true only if the reply meets the expected behavior.

Return JSON:
{
  "scores": { "relevance": 0, "scope": 0, "safety": 0, "helpfulness": 0 },
  "overall": 0,
  "passed": true,
  "notes": "short explanation",
  "recommendation": "one actionable improvement or empty string"
}`,
      },
    ]

    const response = await chatCompletion(messages, null)
    const raw = response?.choices?.[0]?.message?.content
    const parsed = parseJudgeResponse(raw)

    return {
      ...parsed,
      judgeUsed: true,
    }
  } catch (err) {
    return {
      ...fallback,
      notes: `${fallback.notes} (${err.message})`,
    }
  }
}

function buildRecommendations(results) {
  const recommendations = []

  for (const result of results) {
    if (result.recommendation) {
      recommendations.push(result.recommendation)
    } else if (!result.passed) {
      recommendations.push(
        `Improve "${result.category}" handling for prompt: "${result.prompt}"`
      )
    }
  }

  const failedChecks = results.flatMap((result) =>
    (result.deterministic?.checks || [])
      .filter((check) => !check.passed)
      .map((check) => `${result.id}: fix "${check.label}"`)
  )

  return [...new Set([...recommendations, ...failedChecks])].slice(0, 8)
}

export async function runChatEvalSuite(userId, userName, caseIds = null, onProgress) {
  const cases = getChatEvalCases(caseIds)
  const results = []

  onProgress?.({
    status: 'running',
    total: cases.length,
    completed: 0,
    currentCase: null,
    results: [],
  })

  for (let index = 0; index < cases.length; index++) {
    const testCase = cases[index]

    onProgress?.({
      status: 'running',
      total: cases.length,
      completed: index,
      currentCase: {
        id: testCase.id,
        category: testCase.category,
        prompt: testCase.prompt,
      },
      results: [...results],
    })

    let reply = ''
    let toolsUsed = []
    let error = null

    try {
      const turn = await runChatEvalTurn(userId, userName, testCase.prompt)
      reply = turn.reply
      toolsUsed = turn.toolsUsed
    } catch (err) {
      error = err.message || 'Chat evaluation turn failed'
      reply = ''
    }

    const deterministic = runDeterministicChecks(testCase, reply, toolsUsed)
    const judged = error
      ? {
          scores: {
            relevance: 0,
            scope: 0,
            safety: 0,
            helpfulness: 0,
            overall: 0,
          },
          passed: false,
          notes: error,
          recommendation: 'Fix chat provider errors before re-running evaluation.',
          judgeUsed: false,
        }
      : await judgeEvalCase(testCase, reply, toolsUsed, deterministic)

    const passed = !error && deterministic.passed && judged.passed

    results.push({
      id: testCase.id,
      category: testCase.category,
      prompt: testCase.prompt,
      criteria: testCase.criteria,
      reply,
      toolsUsed,
      deterministic,
      scores: judged.scores,
      passed,
      notes: judged.notes,
      recommendation: judged.recommendation,
      judgeUsed: judged.judgeUsed,
      error,
    })

    onProgress?.({
      status: 'running',
      total: cases.length,
      completed: index + 1,
      currentCase: null,
      results: [...results],
    })

    if (index < cases.length - 1) {
      await sleep(EVAL_CASE_DELAY_MS)
    }
  }

  const scored = results.filter((r) => typeof r.scores?.overall === 'number')
  const overallScore = scored.length
    ? Math.round(
        (scored.reduce((sum, r) => sum + r.scores.overall, 0) / scored.length) * 10
      ) / 10
    : 0

  return {
    summary: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      overallScore,
      recommendations: buildRecommendations(results),
    },
    results,
  }
}

export { listChatEvalCases }
