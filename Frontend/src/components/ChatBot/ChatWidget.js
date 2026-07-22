import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline'
import axiosInstance from '../../utils/axiosInstance'
import { TypingDots, buildClientWelcomeMessage, SUGGESTED_PROMPTS, routeStatusLabel, chatErrorMessage } from './chatFormatting'
import AiDisclosureBanner from './AiDisclosureBanner'
import ChatMessageBody from './chatBlocks/ChatMessageBody'
import CheckoutPaymentCard from './CheckoutPaymentCard'
import { checkoutCardVisible } from './checkoutMessageHelpers'
import { useCheckoutHandlers } from './useCheckoutHandlers'
import { useShopAIChatActions } from './useShopAIChat'
import {
  readWidgetSessionId,
  writeWidgetSessionId,
  clearWidgetSessionId,
} from './widgetSessionStorage'
import {
  buildGuestHistory,
  enrichAssistantMessage,
  welcomeSuggestedPromptsBlock,
} from './guestChatHistory'
import { ASSISTANT_PATH, assistantSessionState } from './assistantNavigation'
import { growTextarea, resetTextareaHeight } from './textareaAutoGrow'
import { useResumePendingChat } from './useResumePendingChat'

const WIDGET_TEXTAREA_MAX_HEIGHT = 80
const GUEST_WIDGET_MESSAGES_KEY = 'shopai_guest_widget_messages'

const WIDGET_WELCOME_SUFFIX =
  '\n\nThis quick chat resumes after a page refresh in this tab. Open **Shop with AI** in the navbar for full history and past conversations.'

const GUEST_WIDGET_WELCOME_SUFFIX =
  '\n\nBrowse, search, and add to cart without an account. **Sign in** when you want to checkout, view orders, or manage addresses.'

function buildWidgetWelcome(name) {
  return buildClientWelcomeMessage(name) + WIDGET_WELCOME_SUFFIX
}

function buildGuestWidgetWelcome() {
  return buildClientWelcomeMessage('there') + GUEST_WIDGET_WELCOME_SUFFIX
}

function readGuestWidgetMessages() {
  try {
    const raw = sessionStorage.getItem(GUEST_WIDGET_MESSAGES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeGuestWidgetMessages(messages) {
  sessionStorage.setItem(GUEST_WIDGET_MESSAGES_KEY, JSON.stringify(messages.slice(-40)))
}

function clearGuestWidgetMessages() {
  sessionStorage.removeItem(GUEST_WIDGET_MESSAGES_KEY)
}

function mapApiMessages(items) {
  return (items || []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    checkout: m.checkout || null,
    blocks: m.blocks || null,
  }))
}



const ChatIcon = () => (

  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">

    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />

  </svg>

)



const CloseIcon = () => (

  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">

    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />

  </svg>

)



const SendIcon = () => (

  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">

    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />

  </svg>

)



export default function ChatWidget() {

  const [isOpen, setIsOpen] = useState(false)

  const [messages, setMessages] = useState([])

  const [input, setInput] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [streamStatus, setStreamStatus] = useState(null)

  const [cartHint, setCartHint] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [sessionHydrated, setSessionHydrated] = useState(false)

  const { userAuth } = useSelector((state) => state?.users)
  const isLoggedIn = userAuth?.isLoggedIn
  const userName = userAuth?.userInfo?.fullname
  const userId = userAuth?.userInfo?._id

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const lastUserIdRef = useRef(userId)
  const handleSendRef = useRef(null)

  useEffect(() => {
    if (userId) lastUserIdRef.current = userId
    if (!isLoggedIn) {
      if (lastUserIdRef.current) {
        clearWidgetSessionId(lastUserIdRef.current)
        lastUserIdRef.current = null
      }
      setSessionId(null)
      const storedGuestMessages = readGuestWidgetMessages()
      setMessages(storedGuestMessages)
      setSessionHydrated(true)
      return
    }

    if (!userId) return

    clearGuestWidgetMessages()
    let cancelled = false
    setSessionHydrated(false)

    const storedId = readWidgetSessionId(userId)
    if (!storedId) {
      setSessionId(null)
      setMessages([])
      setSessionHydrated(true)
      return undefined
    }

    setSessionId(storedId)

    axiosInstance
      .get(`/chat/sessions/${storedId}`)
      .then(({ data }) => {
        if (cancelled) return
        setMessages(mapApiMessages(data.session?.messages))
      })
      .catch(() => {
        if (cancelled) return
        clearWidgetSessionId(userId)
        setSessionId(null)
        setMessages([])
      })
      .finally(() => {
        if (!cancelled) setSessionHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [isLoggedIn, userId])

  const { sendMessage, handleClientActions } = useShopAIChatActions()

  const { handleCheckoutPaid, handleCheckoutExpired } = useCheckoutHandlers(setMessages)



  const scrollToBottom = useCallback(() => {

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  }, [])



  useEffect(() => {

    scrollToBottom()

  }, [messages, isLoading, streamStatus, scrollToBottom])



  useEffect(() => {

    if (isOpen && inputRef.current) {

      inputRef.current.focus()

    }

  }, [isOpen])



  useEffect(() => {
    if (!input) resetTextareaHeight(inputRef.current)
  }, [input])

  const ensureWelcomeMessage = useCallback(() => {
    setMessages((current) => {
      if (current.length > 0) return current
      return [
        {
          role: 'assistant',
          content: isLoggedIn ? buildWidgetWelcome(userName) : buildGuestWidgetWelcome(),
          blocks: [welcomeSuggestedPromptsBlock(SUGGESTED_PROMPTS)],
        },
      ]
    })
  }, [isLoggedIn, userName])

  const handleTextareaInput = (e) => {
    setInput(e.target.value)
    growTextarea(e.target, WIDGET_TEXTAREA_MAX_HEIGHT)
  }

  const handleSend = async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || isLoading) return



    const updatedMessages = [...messages, { role: 'user', content: text }]

    setMessages(updatedMessages)

    setInput('')

    const streamMessageId = `stream-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: streamMessageId, role: 'assistant', content: '', streaming: true },
    ])
    setStreamStatus(null)
    setIsLoading(true)

    try {
      const data = await sendMessage(
        {
          text,
          sessionId: sessionId ?? undefined,
          isGuest: !isLoggedIn,
          history: isLoggedIn ? [] : buildGuestHistory(updatedMessages),
        },
        {
          onRoute: ({ route }) => setStreamStatus(routeStatusLabel(route)),
          onToolStart: ({ label }) => setStreamStatus(label || 'Working…'),
          onTextDelta: ({ delta }) => {
            setStreamStatus(null)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === streamMessageId
                  ? { ...msg, content: `${msg.content || ''}${delta || ''}` }
                  : msg
              )
            )
          },
        }
      )

      if (data.sessionId) {
        setSessionId(data.sessionId)
        writeWidgetSessionId(userId, data.sessionId)
      }

      const { cartSummary } = handleClientActions(data)

      if (cartSummary?.itemCount > 0) {
        setCartHint(
          `Cart: ${cartSummary.itemCount} unit${cartSummary.itemCount === 1 ? '' : 's'} — ₹${Number(cartSummary.total).toLocaleString('en-IN')}`
        )
      }

      setMessages((prev) => {
        const next = prev.map((msg) =>
          msg.id === streamMessageId
            ? enrichAssistantMessage(msg, data)
            : msg
        )
        if (!isLoggedIn) writeGuestWidgetMessages(next)
        return next
      })
    } catch (err) {
      const errorMsg = chatErrorMessage(err)

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamMessageId
            ? {
                ...msg,
                content: errorMsg,
                streaming: false,
                failed: true,
                retryText: text,
              }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
      setStreamStatus(null)
    }

  }

  handleSendRef.current = handleSend

  const resumePendingQuery = useCallback((query) => {
    handleSendRef.current?.(query)
  }, [])

  const chatReturnPath =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search || ''}`
      : ASSISTANT_PATH

  useResumePendingChat({
    isLoggedIn,
    isReady: sessionHydrated,
    onResume: resumePendingQuery,
  })



  const handleKeyDown = (e) => {

    if (e.key === 'Enter' && !e.shiftKey) {

      e.preventDefault()

      handleSend()

    }

  }



  const toggleChat = () => {
    setIsOpen((prev) => {
      const opening = !prev
      if (opening && sessionHydrated) {
        ensureWelcomeMessage()
      }
      return opening
    })
  }



  return (

    <>

      {!isOpen && (

        <button

          onClick={toggleChat}

          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-800 text-white flex items-center justify-center hover:bg-blue-900 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"

          style={{ boxShadow: '0 4px 20px rgba(30, 64, 175, 0.4)' }}

          aria-label="Open chat"

        >

          <ChatIcon />

        </button>

      )}



      {isOpen && (

        <div

          className="fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-2xl overflow-hidden"

          style={{

            width: '400px',

            height: '560px',

            maxHeight: 'calc(100vh - 48px)',

            maxWidth: 'calc(100vw - 32px)',

            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',

          }}

        >

          <div className="flex items-center justify-between px-5 py-4 bg-blue-800 text-white flex-shrink-0">

            <div className="flex items-center gap-3 min-w-0">

              <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center shrink-0">

                <ChatIcon />

              </div>

              <div className="min-w-0">

                <h3 className="font-semibold text-sm leading-tight">Shop with AI</h3>

                <p className="text-xs text-blue-200">AI shopping assistant</p>

                {cartHint && (

                  <p className="text-xs text-blue-100 mt-0.5">

                    <Link to="/shopping-cart" className="underline hover:text-white">

                      {cartHint}

                    </Link>

                  </p>

                )}

              </div>

            </div>

            <div className="flex items-center gap-1 shrink-0">

              <Link

                to={ASSISTANT_PATH}

                state={assistantSessionState(sessionId)}

                className="p-1.5 rounded-full hover:bg-blue-700 transition-colors"

                aria-label="Open full assistant"

                title="Open full assistant"

              >

                <ArrowsPointingOutIcon className="w-5 h-5" />

              </Link>

              <button

                onClick={toggleChat}

                className="p-1.5 rounded-full hover:bg-blue-700 transition-colors focus:outline-none"

                aria-label="Close chat"

              >

                <CloseIcon />

              </button>

            </div>

          </div>



          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
            <AiDisclosureBanner compact />

            {!sessionHydrated && (
              <p className="text-center text-sm text-gray-500 py-6">Loading conversation…</p>
            )}

            {sessionHydrated &&
              messages.map((msg, i) => (
              <div
                key={msg.id || i}
                className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-800 text-white rounded-br-md whitespace-pre-wrap'
                      : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    msg.streaming && !msg.content ? (
                      streamStatus ? (
                        <span className="text-gray-500 italic">{streamStatus}…</span>
                      ) : (
                        <TypingDots />
                      )
                    ) : (
                      <ChatMessageBody
                        content={msg.content}
                        blocks={msg.blocks}
                        onQuickAction={handleSend}
                        disabled={isLoading}
                        returnPath={chatReturnPath}
                      />
                    )
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'assistant' && msg.failed && msg.retryText && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSend(msg.retryText)}
                    className="text-xs font-semibold text-indigo-600 underline hover:text-indigo-800 disabled:opacity-50"
                  >
                    Retry
                  </button>
                )}
                {checkoutCardVisible(msg.checkout) && (
                  <div className="max-w-[85%]">
                    <CheckoutPaymentCard
                      checkoutUrl={msg.checkout.checkoutUrl}
                      orderId={msg.checkout.orderId}
                      orderNumber={msg.checkout.orderNumber}
                      totalPrice={msg.checkout.totalPrice}
                      source={msg.checkout.source || 'chat'}
                      paid={msg.checkout.paid}
                      expired={msg.checkout.expired}
                      onPaid={handleCheckoutPaid}
                      onExpired={handleCheckoutExpired}
                    />
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />

          </div>



          <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-200">

            <div className="flex items-end gap-2">

              <textarea

                ref={inputRef}

                value={input}

                onChange={handleTextareaInput}

                onInput={handleTextareaInput}

                onKeyDown={handleKeyDown}

                placeholder="Ask about orders, products, coupons..."

                className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                rows={1}

                style={{ maxHeight: `${WIDGET_TEXTAREA_MAX_HEIGHT}px` }}

                disabled={isLoading}

              />

              <button

                onClick={handleSend}

                disabled={isLoading || !input.trim()}

                className="p-2.5 rounded-xl bg-blue-800 text-white hover:bg-blue-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"

                aria-label="Send message"

              >

                <SendIcon />

              </button>

            </div>

          </div>

        </div>

      )}

    </>

  )

}


