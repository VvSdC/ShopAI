import crypto from 'crypto'
import { REQUEST_ID_HEADER, runWithRequestContext } from '../utils/requestContext.js'

const REQUEST_ID_PATTERN = /^[\w-]{8,128}$/

function resolveRequestId(headerValue) {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue
  const trimmed = String(raw || '').trim()
  if (REQUEST_ID_PATTERN.test(trimmed)) {
    return trimmed
  }
  return crypto.randomUUID()
}

/** Attach a correlation ID to each HTTP request and response. */
export function requestIdMiddleware(req, res, next) {
  const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER])
  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)

  runWithRequestContext({ requestId }, () => next())
}
