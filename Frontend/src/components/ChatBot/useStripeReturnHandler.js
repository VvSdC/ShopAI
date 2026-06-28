import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import axiosInstance from '../../utils/axiosInstance'
import { clearCartAction } from '../../redux/slices/cart/cartSlices'
import { markPostCheckout } from '../../utils/postCheckout'

/** Survives Strict Mode remounts so verify/clear only run once per session. */
const verifyPromises = new Map()

function getVerifiedPayment(sessionId) {
  if (!verifyPromises.has(sessionId)) {
    verifyPromises.set(
      sessionId,
      axiosInstance
        .get(`/orders/verify-payment/${sessionId}`)
        .then((res) => res.data)
        .catch((err) => {
          verifyPromises.delete(sessionId)
          throw err
        })
    )
  }
  return verifyPromises.get(sessionId)
}

export function isStripePaymentReturnSearch(search) {
  const params = new URLSearchParams(search)
  return params.get('payment') === 'success' && Boolean(params.get('session_id'))
}

export function useStripeReturnHandler({
  onVerified,
  onVerifyFailed,
  defaultRedirect = '/assistant',
}) {
  const dispatch = useDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const onVerifiedRef = useRef(onVerified)
  const onVerifyFailedRef = useRef(onVerifyFailed)

  onVerifiedRef.current = onVerified
  onVerifyFailedRef.current = onVerifyFailed

  useEffect(() => {
    const payment = searchParams.get('payment')
    const sessionId = searchParams.get('session_id')
    if (payment !== 'success' || !sessionId) return

    let cancelled = false

    ;(async () => {
      try {
        const data = await getVerifiedPayment(sessionId)
        markPostCheckout()
        await dispatch(clearCartAction()).unwrap().catch(() => {})
        if (cancelled) return

        await onVerifiedRef.current?.(data)
        if (cancelled) return

        const redirectTo = data?.order?.checkoutSource === 'cart'
          ? '/customer-profile'
          : defaultRedirect
        setSearchParams({}, { replace: true })
        if (redirectTo !== window.location.pathname) {
          navigate(redirectTo, { replace: true })
        }
      } catch (err) {
        if (cancelled) return
        console.error('Payment verification failed:', err)
        setSearchParams({}, { replace: true })
        onVerifyFailedRef.current?.(err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, setSearchParams, navigate, defaultRedirect, dispatch])
}
