import config from '../config/env.js'
import {
  applyOperationalFlag,
  clientErrorMessage,
  resolveStatusCode,
} from '../utils/appError.js'

export const globalErrhandler = (err, req, res, _next) => {
  applyOperationalFlag(err, res)
  const statusCode = resolveStatusCode(err, res)
  const message = clientErrorMessage(err, statusCode)

  if (statusCode >= 500 || !err?.isOperational) {
    console.error('[error]', req.method, req.originalUrl, err)
  }

  res.status(statusCode).json({
    message,
    ...(!config.isProduction && err?.stack && { stack: err.stack }),
  })
}

export const notFound = (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`)
  err.statusCode = 404
  err.isOperational = true
  next(err)
}
