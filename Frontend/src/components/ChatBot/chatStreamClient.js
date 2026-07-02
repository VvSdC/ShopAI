import baseURL from '../../utils/baseURL'
import { ensureCsrfToken } from '../../utils/axiosInstance'
import { CSRF_HEADER_NAME } from '../../utils/csrfConstants'

async function* parseSseStream(reader) {
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      if (!part.trim()) continue

      let eventType = 'message'
      let dataLine = ''

      for (const line of part.split('\n')) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          dataLine += line.slice(5).trim()
        }
      }

      if (!dataLine) continue

      try {
        yield { type: eventType, data: JSON.parse(dataLine) }
      } catch {
        // ignore malformed events
      }
    }
  }
}

export async function postChatMessageStream({ message, sessionId }, handlers = {}) {
  const token = await ensureCsrfToken()
  const response = await fetch(`${baseURL}/chat/message/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [CSRF_HEADER_NAME]: token,
    },
    credentials: 'include',
    body: JSON.stringify({
      message,
      ...(sessionId ? { sessionId } : {}),
    }),
  })

  if (!response.ok) {
    let errorMessage = 'Chat request failed'
    try {
      const body = await response.json()
      errorMessage = body.message || body.error || errorMessage
    } catch {
      // ignore
    }
    throw new Error(errorMessage)
  }

  if (!response.body) {
    throw new Error('Streaming response is not supported in this browser')
  }

  const reader = response.body.getReader()
  let donePayload = null

  for await (const { type, data } of parseSseStream(reader)) {
    switch (type) {
      case 'route':
        handlers.onRoute?.(data)
        break
      case 'tool_start':
        handlers.onToolStart?.(data)
        break
      case 'tool_end':
        handlers.onToolEnd?.(data)
        break
      case 'text_delta':
        handlers.onTextDelta?.(data)
        break
      case 'done':
        donePayload = data
        handlers.onDone?.(data)
        break
      case 'error':
        throw new Error(data?.message || 'Chat stream failed')
      default:
        break
    }
  }

  if (!donePayload) {
    throw new Error('Chat stream ended without a final response')
  }

  return donePayload
}

export async function postGuestChatMessageStream(
  { message, history = [], localCart = [] },
  handlers = {}
) {
  const token = await ensureCsrfToken()
  const response = await fetch(`${baseURL}/chat/guest/message/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [CSRF_HEADER_NAME]: token,
    },
    credentials: 'include',
    body: JSON.stringify({
      message,
      history,
      localCart,
    }),
  })

  if (!response.ok) {
    let errorMessage = 'Chat request failed'
    try {
      const body = await response.json()
      errorMessage = body.message || body.error || errorMessage
    } catch {
      // ignore
    }
    throw new Error(errorMessage)
  }

  if (!response.body) {
    throw new Error('Streaming response is not supported in this browser')
  }

  const reader = response.body.getReader()
  let donePayload = null

  for await (const { type, data } of parseSseStream(reader)) {
    switch (type) {
      case 'route':
        handlers.onRoute?.(data)
        break
      case 'tool_start':
        handlers.onToolStart?.(data)
        break
      case 'tool_end':
        handlers.onToolEnd?.(data)
        break
      case 'text_delta':
        handlers.onTextDelta?.(data)
        break
      case 'done':
        donePayload = data
        handlers.onDone?.(data)
        break
      case 'error':
        throw new Error(data?.message || 'Chat stream failed')
      default:
        break
    }
  }

  if (!donePayload) {
    throw new Error('Chat stream ended without a final response')
  }

  return donePayload
}
