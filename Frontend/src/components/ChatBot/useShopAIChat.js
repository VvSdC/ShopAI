import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import axiosInstance from '../../utils/axiosInstance'
import { getCartFromServerAction } from '../../redux/slices/cart/cartSlices'

export function useShopAIChatActions() {
  const dispatch = useDispatch()

  const handleClientActions = useCallback(
    (data) => {
      const actions = data?.clientActions || []
      for (const action of actions) {
        if (action.type === 'sync_cart') {
          dispatch(getCartFromServerAction())
        }
      }
      return {
        cartSummary: data?.cartSummary || null,
        checkout: data?.checkout || null,
      }
    },
    [dispatch]
  )

  const sendMessage = useCallback(async ({ text, sessionId }) => {
    const payload = { message: text }
    if (sessionId) {
      payload.sessionId = sessionId
    }

    const { data } = await axiosInstance.post('/chat/message', payload)
    return data
  }, [])

  return { sendMessage, handleClientActions }
}

export function formatSessionDate(value) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}
