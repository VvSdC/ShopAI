import { getRequestId } from './requestContext.js'

function write(level, args) {
  const requestId = getRequestId()
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
