import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  PlusIcon,
  TrashIcon,
  Bars3Icon,
  SparklesIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import axiosInstance from '../../utils/axiosInstance'
import {
  TypingDots,
  SUGGESTED_PROMPTS,
  AI_CHATBOT_LABEL,
  buildClientWelcomeMessage,
  routeStatusLabel,
  chatErrorMessage,
} from './chatFormatting'
import AiDisclosureBanner from './AiDisclosureBanner'
import ChatMessageBody from './chatBlocks/ChatMessageBody'
import CheckoutPaymentCard from './CheckoutPaymentCard'
import { checkoutCardVisible } from './checkoutMessageHelpers'
import { useStripeReturnHandler } from './useStripeReturnHandler'
import { useCheckoutHandlers } from './useCheckoutHandlers'
import ConfirmDialog from '../common/ConfirmDialog'
import {
  useShopAIChatActions,
  formatSessionDate,
} from './useShopAIChat'
import { growTextarea, resetTextareaHeight } from './textareaAutoGrow'
import { keepStripeReturnSearch, ASSISTANT_PATH } from './assistantNavigation'
import { useResumePendingChat } from './useResumePendingChat'
import {
  buildGuestHistory,
  enrichAssistantMessage,
  readGuestAssistantMessages,
  writeGuestAssistantMessages,
  clearGuestAssistantMessages,
  welcomeSuggestedPromptsBlock,
} from './guestChatHistory'

const ASSISTANT_TEXTAREA_MAX_HEIGHT = 120
const GUEST_ASSISTANT_WELCOME_SUFFIX =
  '\n\nBrowse and add to cart without an account. Sign in when you want to checkout, view orders, or manage addresses.'

function buildGuestAssistantWelcome() {
  return buildClientWelcomeMessage('there') + GUEST_ASSISTANT_WELCOME_SUFFIX
}

function guestWelcomeMessages() {
  const stored = readGuestAssistantMessages()
  if (stored.length > 0) return stored
  return [
    {
      role: 'assistant',
      content: buildGuestAssistantWelcome(),
      blocks: [welcomeSuggestedPromptsBlock(SUGGESTED_PROMPTS)],
    },
  ]
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-5 h-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
      />
    </svg>
  )
}

export default function AssistantPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLoggedIn = useSelector((state) => state?.users?.userAuth?.isLoggedIn)
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [hasMoreOlder, setHasMoreOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamStatus, setStreamStatus] = useState(null)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sessionsLoadError, setSessionsLoadError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cartHint, setCartHint] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const handleSendRef = useRef(null)
  const { sendMessage, handleClientActions } = useShopAIChatActions()

  const { handleCheckoutPaid, handleCheckoutExpired } = useCheckoutHandlers(setMessages)

  useStripeReturnHandler({
    defaultRedirect: '/assistant',
    onVerified: handleCheckoutPaid,
  })

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (isLoggedIn) clearGuestAssistantMessages()
  }, [isLoggedIn])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, streamStatus, scrollToBottom])

  useEffect(() => {
    if (!input) resetTextareaHeight(inputRef.current)
  }, [input])

  const handleTextareaInput = useCallback((e) => {
    setInput(e.target.value)
    growTextarea(e.target, ASSISTANT_TEXTAREA_MAX_HEIGHT)
  }, [])

  const mapApiMessages = useCallback(
    (items) =>
      (items || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        checkout: m.checkout || null,
        blocks: m.blocks || null,
      })),
    []
  )

  const loadSession = useCallback(async (sessionId) => {
    const { data } = await axiosInstance.get(`/chat/sessions/${sessionId}`)
    setActiveSessionId(data.session.id)
    setMessages(mapApiMessages(data.session.messages))
    setHasMoreOlder(Boolean(data.session.hasMoreOlder))
  }, [mapApiMessages])

  const loadOlderMessages = useCallback(async () => {
    if (!activeSessionId || loadingOlder || !hasMoreOlder) return

    const oldestMessageId = messages[0]?.id
    if (!oldestMessageId) return

    setLoadingOlder(true)
    try {
      const { data } = await axiosInstance.get(
        `/chat/sessions/${activeSessionId}/messages`,
        { params: { beforeMessageId: oldestMessageId } }
      )
      setMessages((prev) => [...mapApiMessages(data.messages), ...prev])
      setHasMoreOlder(Boolean(data.hasMoreOlder))
    } finally {
      setLoadingOlder(false)
    }
  }, [activeSessionId, hasMoreOlder, loadingOlder, mapApiMessages, messages])

  const startNewConversation = useCallback(async () => {
    const { data } = await axiosInstance.post('/chat/sessions')
    const session = data.session
    setSessions((prev) => [
      {
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        messageCount: session.messages?.length || 0,
      },
      ...prev.filter((s) => s.id !== session.id),
    ])
    setActiveSessionId(session.id)
    setMessages(mapApiMessages(session.messages))
    setHasMoreOlder(Boolean(session.hasMoreOlder))
    setSessionsLoadError(null)
    setSidebarOpen(false)
    inputRef.current?.focus()
  }, [mapApiMessages])

  const fetchSessionList = useCallback(async () => {
    const { data } = await axiosInstance.get('/chat/sessions')
    const list = data.sessions || []
    setSessions(list)
    return list
  }, [])

  const reloadSessions = useCallback(async () => {
    setLoadingSessions(true)
    setSessionsLoadError(null)
    try {
      const list = await fetchSessionList()
      const activeId = activeSessionId
      if (activeId && list.some((s) => s.id === activeId)) {
        await loadSession(activeId)
      } else if (list.length > 0) {
        await loadSession(list[0].id)
      } else {
        await startNewConversation()
      }
    } catch (err) {
      console.error('Failed to reload chat sessions:', err)
      setSessionsLoadError('Could not load your conversations. Please refresh.')
    } finally {
      setLoadingSessions(false)
    }
  }, [activeSessionId, fetchSessionList, loadSession, startNewConversation])

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams(location.search)
    const startNew =
      location.state?.startNew === true || params.get('new') === '1'
    const sessionIdFromNav = location.state?.sessionId || params.get('session') || null
    const cleanPath = `${location.pathname}${keepStripeReturnSearch(location.search)}`
    const shouldCleanNav =
      location.state?.startNew ||
      location.state?.sessionId ||
      params.get('new') ||
      params.get('session')

    async function initSessions() {
      setLoadingSessions(true)
      setSessionsLoadError(null)
      try {
        if (!isLoggedIn) {
          setSessions([])
          setActiveSessionId('guest')
          setMessages(guestWelcomeMessages())
          setHasMoreOlder(false)
          if (shouldCleanNav && !cancelled) {
            navigate(cleanPath, { replace: true, state: null })
          }
          return
        }

        const list = await fetchSessionList()
        if (cancelled) return

        if (startNew) {
          await startNewConversation()
        } else if (sessionIdFromNav) {
          try {
            await loadSession(sessionIdFromNav)
          } catch (err) {
            console.error('Failed to load chat session:', err)
            if (list.length > 0) {
              await loadSession(list[0].id)
            } else {
              await startNewConversation()
            }
          }
        } else if (list.length > 0) {
          await loadSession(list[0].id)
        } else {
          await startNewConversation()
        }

        if (shouldCleanNav && !cancelled) {
          navigate(cleanPath, { replace: true, state: null })
        }
      } catch (err) {
        console.error('Failed to load chat sessions:', err)
        if (!cancelled) {
          setSessionsLoadError('Could not load your conversations. Please refresh.')
        }
      } finally {
        if (!cancelled) setLoadingSessions(false)
      }
    }

    initSessions()
    return () => {
      cancelled = true
    }
    // Re-init when navigating to /assistant (e.g. navbar "new chat" or widget expand).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  const confirmDeleteSession = async () => {
    if (!deleteTarget) return
    const sessionId = deleteTarget
    setDeleteTarget(null)
    await axiosInstance.delete(`/chat/sessions/${sessionId}`)
    const remaining = sessions.filter((s) => s.id !== sessionId)
    setSessions(remaining)
    if (activeSessionId === sessionId) {
      if (remaining.length) {
        await loadSession(remaining[0].id)
      } else {
        await startNewConversation()
      }
    }
  }

  const handleSend = async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || isLoading || !activeSessionId) return

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    const streamMessageId = `stream-${Date.now()}`
    const guestHistoryBase = isLoggedIn ? messages : [...messages, { role: 'user', content: text }]
    setMessages((prev) => [
      ...prev,
      { id: streamMessageId, role: 'assistant', content: '', streaming: true },
    ]))
    setStreamStatus(null)
    setIsLoading(true)

    try {
      const data = await sendMessage(
        {
          text,
          sessionId: isLoggedIn ? activeSessionId : undefined,
          isGuest: !isLoggedIn,
          history: isLoggedIn ? [] : buildGuestHistory(guestHistoryBase),
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
      const { cartSummary } = handleClientActions(data)
      if (cartSummary?.itemCount > 0) {
        setCartHint(
          `Cart updated: ${cartSummary.itemCount} unit${cartSummary.itemCount === 1 ? '' : 's'} — ₹${Number(cartSummary.total).toLocaleString('en-IN')}`
        )
      }

      setMessages((prev) => {
        const next = prev.map((msg) =>
          msg.id === streamMessageId ? enrichAssistantMessage(msg, data) : msg
        )
        if (!isLoggedIn) writeGuestAssistantMessages(next)
        return next
      })

      if (data.sessionTitle) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, title: data.sessionTitle, updatedAt: new Date().toISOString() }
              : s
          )
        )
      }
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

  useResumePendingChat({
    isLoggedIn,
    isReady: !loadingSessions && Boolean(activeSessionId),
    onResume: resumePendingQuery,
  })

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      {/* Brand header — doubles as the way back to the store */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-3">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm ring-1 ring-indigo-400/30 transition group-hover:bg-indigo-500">
            <svg
              className="h-5 w-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m7.5 0v4.5m-7.5-4.5h15m-7.5 0V18a2.25 2.25 0 002.25 2.25h3.375c1.035 0 1.875-.84 1.875-1.875V10.5M7.5 21h9"
              />
            </svg>
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-sm font-bold tracking-tight text-white">ShopAI</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-300">
              AI Assistant
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="-mr-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="shrink-0 p-3">
        <button
          type="button"
          onClick={startNewConversation}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          <PlusIcon className="h-5 w-5" />
          New conversation
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <p className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Recent
        </p>
        {loadingSessions ? (
          <div className="space-y-1.5 px-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-shimmer h-12 rounded-lg bg-white/5"
              />
            ))}
          </div>
        ) : sessionsLoadError ? (
          <div className="space-y-3 px-3 py-4">
            <p className="text-sm text-red-300">{sessionsLoadError}</p>
            <button
              type="button"
              onClick={reloadSessions}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Try again
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <ChatBubbleLeftRightIcon className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-2 text-sm text-slate-400">No conversations yet</p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map((session) => (
              <li key={session.id}>
                <div
                  className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    activeSessionId === session.id
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      loadSession(session.id)
                      setSidebarOpen(false)
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate font-medium">{session.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatSessionDate(session.updatedAt)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(session.id)
                    }}
                    className="shrink-0 rounded-md p-1 text-slate-500 opacity-0 transition hover:bg-white/10 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-white/10 p-3 text-xs text-slate-400">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg px-2 py-2 font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to store
        </Link>
        <div className="flex flex-wrap gap-x-2 gap-y-1 px-2">
          <Link to="/products-filters" className="hover:text-white hover:underline">
            Catalog
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/shopping-cart" className="hover:text-white hover:underline">
            Cart
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/about" className="hover:text-white hover:underline">
            About
          </Link>
        </div>
        <p className="px-2 text-slate-600">
          © {new Date().getFullYear()} ShopAI
        </p>
      </div>
    </div>
  )

  return (
    <div
      className="flex h-screen overflow-hidden bg-stone-50"
      style={{ height: '100dvh' }}
    >
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-72 shrink-0 lg:block xl:w-80">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!sidebarOpen}
      >
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
        />
        <aside
          className={`absolute bottom-0 left-0 top-0 h-full w-80 max-w-[85vw] shadow-2xl transition-transform duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </aside>
      </div>

      {/* Main chat — messages + input only */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-white/90 px-3 py-2.5 backdrop-blur sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversations"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white sm:h-10 sm:w-10">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold text-stone-900 sm:text-lg">
                  Shop with AI
                </h1>
                <span className="hidden rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-800 sm:inline">
                  {AI_CHATBOT_LABEL}
                </span>
              </div>
              <p className="truncate text-xs text-stone-500">Shop naturally with AI</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {cartHint && (
              <p className="hidden max-w-xs truncate text-xs text-stone-500 md:block">
                {cartHint}
                {' · '}
                <Link to="/shopping-cart" className="font-medium text-indigo-600 hover:text-indigo-800">
                  View cart
                </Link>
              </p>
            )}
            <button
              type="button"
              onClick={startNewConversation}
              className="rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-100 lg:hidden"
              aria-label="New conversation"
            >
              <PlusIcon className="h-6 w-6" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="sticky top-0 z-10 -mx-1 bg-stone-50 pb-4 pt-1 space-y-3">
              <AiDisclosureBanner />
              {sessionsLoadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p>{sessionsLoadError}</p>
                  <button
                    type="button"
                    onClick={reloadSessions}
                    className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>

            {messages.length <= 1 && !isLoading && (
              <div className="mb-6 animate-fade-up">
                <div className="mb-5 flex flex-col items-center text-center sm:items-start sm:text-left">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                    <SparklesIcon className="h-6 w-6" />
                  </span>
                  <h2 className="mt-3 text-xl font-bold text-stone-900 sm:text-2xl">
                    How can I help you shop today?
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Ask me to find products, track orders, or build your cart.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-800 hover:shadow-md"
                    >
                      <span>{prompt}</span>
                      <SparklesIcon className="h-4 w-4 shrink-0 text-stone-300 transition-colors group-hover:text-indigo-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasMoreOlder && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={loadOlderMessages}
                  disabled={loadingOlder}
                  className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                >
                  {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                </button>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={msg.id ?? `${msg.role}-${i}`}
                className={`flex animate-fade-up flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 text-xs font-medium text-stone-400">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                      <SparklesIcon className="h-3.5 w-3.5" />
                    </span>
                    ShopAI
                  </div>
                )}
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md whitespace-pre-wrap'
                      : 'bg-white text-stone-800 rounded-bl-md border border-stone-200 shadow-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    msg.streaming && !msg.content ? (
                      streamStatus ? (
                        <span className="text-stone-500 italic">{streamStatus}…</span>
                      ) : (
                        <TypingDots />
                      )
                    ) : (
                      <ChatMessageBody
                        content={msg.content}
                        blocks={msg.blocks}
                        onQuickAction={handleSend}
                        disabled={isLoading}
                        returnPath={ASSISTANT_PATH}
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
                  <div className="max-w-[90%] sm:max-w-[80%]">
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
        </div>

        <div className="shrink-0 border-t border-stone-200 bg-white px-3 pb-3 pt-3 sm:px-8 sm:pb-5">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-stone-300 bg-white p-2 shadow-sm transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaInput}
                onInput={handleTextareaInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Search products, check orders, add to cart, checkout…"
                className="flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-0"
                rows={1}
                style={{ maxHeight: `${ASSISTANT_TEXTAREA_MAX_HEIGHT}px` }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </div>
            <p className="mt-1.5 hidden text-center text-[11px] text-stone-400 sm:block">
              Press Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete conversation?"
        message="This chat will be permanently removed from your history. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={confirmDeleteSession}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
