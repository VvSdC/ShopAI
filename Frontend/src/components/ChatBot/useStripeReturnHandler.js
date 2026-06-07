import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'

export function useStripeReturnHandler({ onVerified, defaultRedirect = '/assistant' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const onVerifiedRef = useRef(onVerified)
  const handledSessionRef = useRef(null)

  onVerifiedRef.current = onVerified

  useEffect(() => {
    const payment = searchParams.get('payment')
    const sessionId = searchParams.get('session_id')
    if (payment !== 'success' || !sessionId) return
    if (handledSessionRef.current === sessionId) return
    handledSessionRef.current = sessionId

    axiosInstance
      .get(`/orders/verify-payment/${sessionId}`)
      .then((res) => {
        onVerifiedRef.current?.(res.data)
        const redirectTo = res.data?.order?.checkoutSource === 'cart'
          ? '/customer-profile'
          : defaultRedirect
        setSearchParams({}, { replace: true })
        if (redirectTo !== window.location.pathname) {
          navigate(redirectTo, { replace: true })
        }
      })
      .catch((err) => {
        console.error('Payment verification failed:', err)
        setSearchParams({}, { replace: true })
      })
  }, [searchParams, setSearchParams, navigate, defaultRedirect])
}
