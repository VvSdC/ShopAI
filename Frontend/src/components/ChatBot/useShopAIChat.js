import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import axiosInstance from '../../utils/axiosInstance'
import {
  getCartFromServerAction,
  getCartItemsFromLocalStorageAction,
} from '../../redux/slices/cart/cartSlices'
import { parseLocalCart } from '../../utils/localCart'
import { postChatMessageStream, postGuestChatMessageStream } from './chatStreamClient'

function readLocalCartItems() {
  return parseLocalCart(localStorage.getItem('cartItems'))
}

function persistLocalCartItems(items) {
  localStorage.setItem('cartItems', JSON.stringify(items || []))
}

export function useShopAIChatActions() {
  const dispatch = useDispatch()

  const handleClientActions = useCallback(
    (data) => {
      const actions = data?.clientActions || []
      for (const action of actions) {
        if (action.type === 'sync_cart') {
          dispatch(getCartFromServerAction())
        }
        if (action.type === 'sync_local_cart' && Array.isArray(action.items)) {
          persistLocalCartItems(action.items)
          dispatch(getCartItemsFromLocalStorageAction())
        }
      }

      if (Array.isArray(data?.localCart)) {
        persistLocalCartItems(data.localCart)
        dispatch(getCartItemsFromLocalStorageAction())
      }

      return {
        cartSummary: data?.cartSummary || null,
        checkout: data?.checkout || null,
      }
    },
    [dispatch]
  )

  const sendMessage = useCallback(
    async ({ text, sessionId, isGuest = false, history = [] }, handlers = {}) => {
      if (isGuest) {
        return postGuestChatMessageStream(
          {
            message: text,
            history,
            localCart: readLocalCartItems(),
          },
          handlers
        )
      }
      return postChatMessageStream({ message: text, sessionId }, handlers)
    },
    []
  )

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

export async function sendChatMessageJson({ text, sessionId }) {
  const payload = { message: text }
  if (sessionId) {
    payload.sessionId = sessionId
  }
  const { data } = await axiosInstance.post('/chat/message', payload)
  return data
}
