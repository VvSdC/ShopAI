import { AppError } from '../utils/appError.js'
import { isValidObjectId } from '../utils/objectId.js'

/**
 * Reject malformed MongoDB id route params before findById (avoids CastError → 500).
 * @param  {...string} paramNames — defaults to `id` when omitted
 */
export function validateObjectId(...paramNames) {
  const names = paramNames.length ? paramNames : ['id']

  return (req, _res, next) => {
    for (const name of names) {
      const value = req.params[name]
      if (value == null || value === '') continue
      if (!isValidObjectId(value)) {
        return next(new AppError(`Invalid ${name}`, 400))
      }
    }
    next()
  }
}
