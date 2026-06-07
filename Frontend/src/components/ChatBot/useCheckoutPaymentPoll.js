import { useCallback, useEffect, useRef, useState } from 'react'
import axiosInstance from '../../utils/axiosInstance'

export const CHECKOUT_POLL_INTERVAL_MS = 20_000
export const CHECKOUT_TIMEOUT_MS = 5 * 60 * 1000

export function useCheckoutPaymentPoll({
  orderId,
  enabled,
  onPaid,
  onExpired,
}) {
  const [status, setStatus] = useState('idle')
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.floor(CHECKOUT_TIMEOUT_MS / 1000)
  )
  const startedAtRef = useRef(null)
  const handledRef = useRef(false)

  const expireCheckout = useCallback(async () => {
    if (!orderId) return
    try {
      await axiosInstance.post(`/orders/expire-checkout/${orderId}`)
    } catch {
      // ignore
    }
  }, [orderId])

  const pollOnce = useCallback(async () => {
    if (!orderId || handledRef.current) return null
    try {
      const { data } = await axiosInstance.get(`/orders/payment-status/${orderId}`)
      if (data.paid) {
        handledRef.current = true
        setStatus('paid')
        onPaid?.(data)
        return data
      }
      if (data.expired) {
        handledRef.current = true
        setStatus('expired')
        onExpired?.(data)
        return data
      }
      setStatus('pending')
      if (typeof data.secondsRemaining === 'number') {
        setSecondsRemaining(data.secondsRemaining)
      }
      return data
    } catch {
      return null
    }
  }, [orderId, onPaid, onExpired])

  useEffect(() => {
    if (!enabled || !orderId) return undefined

    handledRef.current = false
    startedAtRef.current = Date.now()
    setStatus('pending')
    setSecondsRemaining(Math.floor(CHECKOUT_TIMEOUT_MS / 1000))

    pollOnce()

    const pollTimer = setInterval(pollOnce, CHECKOUT_POLL_INTERVAL_MS)

    const countdownTimer = setInterval(() => {
      const started = startedAtRef.current || Date.now()
      const elapsed = Date.now() - started
      const remaining = Math.max(0, Math.floor((CHECKOUT_TIMEOUT_MS - elapsed) / 1000))
      setSecondsRemaining(remaining)
      if (remaining <= 0 && !handledRef.current) {
        handledRef.current = true
        setStatus('expired')
        expireCheckout()
        onExpired?.({ expired: true })
      }
    }, 1000)

    return () => {
      clearInterval(pollTimer)
      clearInterval(countdownTimer)
    }
  }, [enabled, orderId, pollOnce, expireCheckout, onExpired])

  return { status, secondsRemaining, pollOnce }
}
