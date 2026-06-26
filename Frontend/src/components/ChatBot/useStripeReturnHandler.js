import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import axiosInstance from '../../utils/axiosInstance'
import { clearCartAction } from '../../redux/slices/cart/cartSlices'

export function useStripeReturnHandler({ onVerified, defaultRedirect = '/assistant' }) {
  const dispatch = useDispatch()
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

    let mounted = true

    axiosInstance
      .get(`/orders/verify-payment/${sessionId}`)
      .then((res) => {
        if (!mounted) return
        return dispatch(clearCartAction()).then(() => {
          if (!mounted) return
          onVerifiedRef.current?.(res.data)
          const redirectTo = res.data?.order?.checkoutSource === 'cart'
            ? '/customer-profile'
            : defaultRedirect
          setSearchParams({}, { replace: true })
          if (redirectTo !== window.location.pathname) {
            navigate(redirectTo, { replace: true })
          }
        })
      })
      .catch((err) => {
        if (!mounted) return
        console.error('Payment verification failed:', err)
        setSearchParams({}, { replace: true })
      })

    return () => {
      mounted = false
    }
  }, [searchParams, setSearchParams, navigate, defaultRedirect, dispatch])
}
