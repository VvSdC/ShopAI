import asyncHandler from 'express-async-handler'
import { runWithOrderIdempotency } from '../services/orderIdempotency.js'

/** Replay checkout placement when the same Idempotency-Key is sent twice. */
export function withOrderIdempotency(buildResponse) {
  return asyncHandler(async (req, res) => {
    const body = await runWithOrderIdempotency({
      userId: req.userAuthId,
      idempotencyKey: req.get('Idempotency-Key'),
      run: () => buildResponse(req),
    })
    res.send(body)
  })
}
