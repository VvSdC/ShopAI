import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  PlusIcon,
  TrashIcon,
  Bars3Icon,
  ShoppingCartIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import axiosInstance from '../../utils/axiosInstance'
import {
  formatMessage,
  TypingDots,
  SUGGESTED_PROMPTS,
  AI_CHATBOT_LABEL,
} from './chatFormatting'
import AiDisclosureBanner from './AiDisclosureBanner'
import {
  useShopAIChatActions,
  formatSessionDate,
} from './useShopAIChat'

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
  const { cartItems } = useSelector((state) => state?.carts)

  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cartHint, setCartHint] = useState('')

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const { sendMessage, handleClientActions } = useShopAIChatActions()

  const cartUnits =
    cartItems?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  const loadSession = useCallback(async (sessionId) => {
    const { data } = await axiosInstance.get(`/chat/sessions/${sessionId}`)
    setActiveSessionId(data.session.id)
    setMessages(
      (data.session.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }))
    )
  }, [])

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
    setMessages(
      (session.messages || []).map((m) => ({ role: m.role, content: m.content }))
    )
    setSidebarOpen(false)
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoadingSessions(true)
      try {
        const { data } = await axiosInstance.get('/chat/sessions')
        const list = data.sessions || []
        setSessions(list)
        if (list.length > 0) {
          await loadSession(list[0].id)
        } else {
          await startNewConversation()
        }
      } catch {
        await startNewConversation()
      } finally {
        setLoadingSessions(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this conversation?')) return
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
    setIsLoading(true)

    try {
      const data = await sendMessage({ text, sessionId: activeSessionId })
      const summary = handleClientActions(data)
      if (summary?.itemCount > 0) {
        setCartHint(
          `${summary.itemCount} in cart — ₹${Number(summary.total).toLocaleString('en-IN')}`
        )
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])

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
      const errorMsg =
        err.response?.data?.message ||
        'Sorry, I had trouble processing that. Please try again.'
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }])
    } finally {
      setIsLoading(false)
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-700 p-4">
        <button
          type="button"
          onClick={startNewConversation}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-500 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loadingSessions ? (
          <p className="px-3 py-4 text-sm text-slate-400">Loading history…</p>
        ) : sessions.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-400">No conversations yet</p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((session) => (
              <li key={session.id}>
                <div
                  className={`group flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    activeSessionId === session.id
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
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
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatSessionDate(session.updatedAt)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => deleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 shrink-0"
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

      <div className="shrink-0 border-t border-slate-700 p-4 space-y-3 text-xs text-slate-400">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <Link to="/products-filters" className="hover:text-white underline">
            Browse catalog
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/shopping-cart" className="hover:text-white underline">
            View cart
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/about" className="hover:text-white underline">
            About ShopAI
          </Link>
        </div>
        <p className="text-slate-500">
          © {new Date().getFullYear()} ShopAI. All rights reserved.
        </p>
      </div>
    </div>
  )

  return (
    <div
      className="flex overflow-hidden bg-stone-50"
      style={{ height: 'calc(100vh - var(--shopai-navbar-height, 4rem))' }}
    >
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-72 shrink-0 border-r border-slate-800 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 h-full w-72 max-w-[85vw] z-50">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main chat — messages + input only */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden rounded-md p-2 text-stone-600 hover:bg-stone-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-stone-900 truncate">
                  Shop with AI
                </h1>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-800">
                  {AI_CHATBOT_LABEL}
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate">
                Shop naturally with AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cartHint && (
              <span className="hidden sm:inline text-xs text-stone-500">{cartHint}</span>
            )}
            <Link
              to="/shopping-cart"
              className="relative inline-flex items-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <ShoppingCartIcon className="h-5 w-5" />
              {cartUnits > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {cartUnits}
                </span>
              )}
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="sticky top-0 z-10 -mx-1 bg-stone-50 pb-4 pt-1">
              <AiDisclosureBanner />
            </div>

            {messages.length <= 1 && !isLoading && (
              <div className="mb-6">
                <p className="text-sm text-stone-500 mb-3">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm text-indigo-800 hover:bg-indigo-100 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md whitespace-pre-wrap'
                      : 'bg-white text-stone-800 rounded-bl-md border border-stone-200 shadow-sm'
                  }`}
                >
                  {msg.role === 'assistant'
                    ? formatMessage(msg.content)
                    : msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-4 py-1.5 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-stone-200 bg-white px-4 py-4 sm:px-8">
          <div className="mx-auto flex max-w-3xl items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Search products, check orders, add to cart, checkout…"
              className="flex-1 resize-none rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={1}
              style={{ maxHeight: '120px' }}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-indigo-600 p-3 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
