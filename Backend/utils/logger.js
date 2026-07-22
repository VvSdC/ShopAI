import { getRequestId } from './requestContext.js'

const useJsonLogs = process.env.LOG_JSON === 'true'

function serializeArgs(args) {
  return args
    .map((arg) => {
      if (arg instanceof Error) return arg.stack || arg.message
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg)
        } catch {
          return String(arg)
        }
      }
      return String(arg)
    })
    .join(' ')
}

function write(level, args) {
  const requestId = getRequestId()
  if (useJsonLogs) {
    const payload = {
      level,
      time: new Date().toISOString(),
      message: serializeArgs(args),
    }
    if (requestId) payload.requestId = requestId
    console[level](JSON.stringify(payload))
    return
  }

  if (requestId) {
    console[level](`[requestId=${requestId}]`, ...args)
  } else {
    console[level](...args)
  }
}

const logger = {
  log(...args) {
    write('log', args)
  },
  info(...args) {
    write('info', args)
  },
  warn(...args) {
    write('warn', args)
  },
  error(...args) {
    write('error', args)
  },
}

export default logger
