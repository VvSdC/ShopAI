import asyncHandler from 'express-async-handler'
import { runWithCartIdempotency } from '../services/cartIdempotency.js'

/** Wrap a cart controller so optional Idempotency-Key replays return the same JSON body. */
export function withCartIdempotency(buildResponse) {
  return asyncHandler(async (req, res) => {
    const body = await runWithCartIdempotency({
      userId: req.userAuthId,
      idempotencyKey: req.get('Idempotency-Key'),
      run: () => buildResponse(req),
    })
    res.json(body)
  })
}
