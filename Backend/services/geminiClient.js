import { config } from '../config/env.js'

const OPENAI_COMPAT_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'

function geminiApiKey() {
  return config.llm.gemini.apiKey
}

function extractGeminiError(data, status) {
  const nested =
    data?.error?.message ||
    data?.error?.status ||
    data?.message ||
    (typeof data?.error === 'string' ? data.error : '')

  if (nested) return nested

  if (Array.isArray(data?.details) && data.details.length) {
    return data.details.map((d) => d.message || JSON.stringify(d)).join('; ')
  }

  return `HTTP ${status}`
}

function toGeminiContents(messages) {
  const contents = []
  let systemInstruction

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = systemInstruction
        ? `${systemInstruction}\n${msg.content}`
        : String(msg.content || '')
      continue
    }

    if (msg.role === 'assistant') {
      contents.push({
        role: 'model',
        parts: [{ text: String(msg.content || '') }],
      })
      continue
    }

    contents.push({
      role: 'user',
      parts: [{ text: String(msg.content || '') }],
    })
  }

  return { contents, systemInstruction }
}

function openAiShapeFromNative(data) {
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim()

  if (!text) return null

  return {
    choices: [{ message: { role: 'assistant', content: text } }],
  }
}

export async function callGeminiNative(model, messages, { maxTokens = 32, temperature = 0.2 } = {}) {
  const apiKey = geminiApiKey()
  if (!apiKey) {
    return { ok: false, error: 'Gemini API key not configured' }
  }

  const { contents, systemInstruction } = toGeminiContents(messages)
  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: extractGeminiError(data, response.status),
      data,
    }
  }

  const shaped = openAiShapeFromNative(data)
  if (!shaped) {
    return {
      ok: false,
      status: response.status,
      error: 'Empty response from Gemini native API',
      data,
    }
  }

  return { ok: true, data: shaped, via: 'native' }
}

export async function callGeminiOpenAiCompatible(
  model,
  messages,
  { maxTokens = 32, temperature = 0.2, tools = null } = {}
) {
  const apiKey = geminiApiKey()
  if (!apiKey) {
    return { ok: false, error: 'Gemini API key not configured' }
  }

  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  }

  if (tools?.length) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const response = await fetch(OPENAI_COMPAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: extractGeminiError(data, response.status),
      data,
    }
  }

  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text && !data?.choices?.[0]?.message?.tool_calls?.length) {
    return {
      ok: false,
      status: response.status,
      error: 'Empty response from Gemini OpenAI-compatible API',
      data,
    }
  }

  return { ok: true, data, via: 'openai' }
}

export async function callGeminiChat(messages, { model, maxTokens = 2048, temperature = 0.7, tools = null } = {}) {
  const useModel = model || config.llm.gemini.model

  if (tools?.length) {
    const openAi = await callGeminiOpenAiCompatible(useModel, messages, {
      maxTokens,
      temperature,
      tools,
    })
    if (openAi.ok) return openAi
    return openAi
  }

  const native = await callGeminiNative(useModel, messages, { maxTokens, temperature })
  if (native.ok) return native

  const openAi = await callGeminiOpenAiCompatible(useModel, messages, { maxTokens, temperature })
  if (openAi.ok) return openAi

  return {
    ok: false,
    status: native.status || openAi.status,
    error: [native.error, openAi.error].filter(Boolean).join(' | '),
  }
}

export async function testGeminiInference(model) {
  const useModel = String(model || config.llm.gemini.model).trim()
  const apiKey = geminiApiKey()

  if (!apiKey) {
    return { ok: false, status: 'not_configured', error: 'Gemini API key not configured' }
  }

  const result = await callGeminiNative(useModel, [{ role: 'user', content: 'Hi' }], {
    maxTokens: 32,
    temperature: 0.2,
  })

  if (result.ok) {
    const text = result.data?.choices?.[0]?.message?.content || ''
    return {
      ok: true,
      status: 'working',
      model: useModel,
      response: text.slice(0, 160),
    }
  }

  if (result.status === 429) {
    return {
      ok: false,
      status: 'rate_limited',
      error: `Rate limited: ${result.error}`,
      model: useModel,
    }
  }

  const openAi = await callGeminiOpenAiCompatible(useModel, [{ role: 'user', content: 'Hi' }], {
    maxTokens: 32,
    temperature: 0.2,
  })

  if (openAi.ok) {
    const text = openAi.data?.choices?.[0]?.message?.content || ''
    return {
      ok: true,
      status: 'working',
      model: useModel,
      response: text.slice(0, 160),
    }
  }

  if (openAi.status === 429) {
    return {
      ok: false,
      status: 'rate_limited',
      error: `Rate limited: ${openAi.error}`,
      model: useModel,
    }
  }

  return {
    ok: false,
    status: 'not_working',
    error: [result.error, openAi.error].filter(Boolean).join(' | '),
    model: useModel,
  }
}
