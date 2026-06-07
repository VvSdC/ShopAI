import { useCallback, useRef } from 'react'
import {
  buildPaymentConfirmedReply,
  normalizePaymentConfirmData,
  patchCheckoutByOrderId,
} from './checkoutMessageHelpers'

export function useCheckoutHandlers(setMessages) {
  const confirmedOrdersRef = useRef(new Set())

  const handleCheckoutPaid = useCallback(
    (data) => {
      const normalized = normalizePaymentConfirmData(data)
      const orderId = normalized.orderId
      if (!orderId) return

      setMessages((prev) =>
        patchCheckoutByOrderId(prev, orderId, { checkoutUrl: null, paid: true })
      )

      if (confirmedOrdersRef.current.has(orderId)) return
      confirmedOrdersRef.current.add(orderId)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: buildPaymentConfirmedReply(normalized),
        },
      ])
    },
    [setMessages]
  )

  const handleCheckoutExpired = useCallback(
    (data) => {
      const orderId = data?.orderId
      if (!orderId) return
      setMessages((prev) =>
        patchCheckoutByOrderId(prev, orderId, { checkoutUrl: null, expired: true })
      )
    },
    [setMessages]
  )

  return { handleCheckoutPaid, handleCheckoutExpired }
}
