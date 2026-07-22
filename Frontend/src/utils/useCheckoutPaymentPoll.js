import { useEffect, useRef, useState } from 'react'
import axiosInstance from './axiosInstance'

export const CHECKOUT_POLL_INTERVAL_MS = 3000
export const CHECKOUT_POLL_MAX_ATTEMPTS = 100

/**
 * Poll order payment status after Stripe checkout opens in another tab.
 */
export function useCheckoutPaymentPoll(orderId, { onPaid, onExpired } = {}) {
  const [polling, setPolling] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(null)
  const callbacksRef = useRef({ onPaid, onExpired })
  callbacksRef.current = { onPaid, onExpired }

  useEffect(() => {
    if (!orderId) {
      setPolling(false)
      setSecondsRemaining(null)
      return undefined
    }

    let cancelled = false
    let timerId = null
    let attempts = 0

    const schedule = (delay = CHECKOUT_POLL_INTERVAL_MS) => {
      timerId = window.setTimeout(runPoll, delay)
    }

    const runPoll = async () => {
      if (cancelled) return
      setPolling(true)
      attempts += 1

      try {
        const { data } = await axiosInstance.get(`/orders/payment-status/${orderId}`)
        if (cancelled) return

        if (data.paid) {
          setPolling(false)
          callbacksRef.current.onPaid?.(data)
          return
        }
        if (data.expired) {
          setPolling(false)
          callbacksRef.current.onExpired?.(data)
          return
        }

        setSecondsRemaining(
          typeof data.secondsRemaining === 'number' ? data.secondsRemaining : null
        )
      } catch {
        if (cancelled) return
      }

      if (attempts < CHECKOUT_POLL_MAX_ATTEMPTS && !cancelled) {
        schedule()
      } else {
        setPolling(false)
      }
    }

    const onFocus = () => {
      if (!cancelled) runPoll()
    }

    window.addEventListener('focus', onFocus)
    runPoll()

    return () => {
      cancelled = true
      if (timerId) window.clearTimeout(timerId)
      window.removeEventListener('focus', onFocus)
      setPolling(false)
    }
  }, [orderId])

  return { polling, secondsRemaining }
}
