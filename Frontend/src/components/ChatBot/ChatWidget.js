import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axiosInstance from '../../utils/axiosInstance'

function formatMessage(text) {
  if (!text) return text

  const lines = text.split('\n')
  const elements = []
  let listBuffer = []
  let listType = null

  const flushList = () => {
    if (listBuffer.length === 0) return
    const tag = listType === 'ol' ? 'ol' : 'ul'
    const listClass = tag === 'ol'
      ? 'list-decimal pl-5 my-1 space-y-0.5'
      : 'list-disc pl-5 my-1 space-y-0.5'
    const items = listBuffer.map((item, j) => (
      <li key={`li-${elements.length}-${j}`}>{formatInline(item)}</li>
    ))
    elements.push(
      tag === 'ol'
        ? <ol key={`list-${elements.length}`} className={listClass}>{items}</ol>
        : <ul key={`list-${elements.length}`} className={listClass}>{items}</ul>
    )
    listBuffer = []
    listType = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const ulMatch = line.match(/^[\s]*[-•*]\s+(.+)/)
    const olMatch = line.match(/^[\s]*\d+[.)]\s+(.+)/)

    if (ulMatch) {
      if (listType === 'ol') flushList()
      listType = 'ul'
      listBuffer.push(ulMatch[1])
    } else if (olMatch) {
      if (listType === 'ul') flushList()
      listType = 'ol'
      listBuffer.push(olMatch[1])
    } else {
      flushList()
      if (line.trim() === '') {
        elements.push(<br key={`br-${i}`} />)
      } else {
        elements.push(
          <span key={`line-${i}`}>
            {formatInline(line)}
            {i < lines.length - 1 && <br />}
          </span>
        )
      }
    }
  }
  flushList()

  return elements
}

function renderTextSegment(segment, keyPrefix) {
  const parts = []
  const regex =
    /(\[([^\]]+)\]\((\/products\/[a-f0-9]{24}|https?:\/\/[^)]+)\))|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\/products\/[a-f0-9]{24})/gi
  let lastIndex = 0
  let match

  while ((match = regex.exec(segment)) !== null) {
    if (match.index > lastIndex) {
      parts.push(segment.slice(lastIndex, match.index))
    }
    if (match[1]) {
      const href = match[3]
      const label = match[2]
      parts.push(
        href.startsWith('/products/') ? (
          <Link
            key={`${keyPrefix}-lnk-${match.index}`}
            to={href}
            className="text-indigo-600 hover:text-indigo-800 font-medium underline"
          >
            {label}
          </Link>
        ) : (
          <a
            key={`${keyPrefix}-lnk-${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 font-medium underline"
          >
            {label}
          </a>
        )
      )
    } else if (match[4]) {
      parts.push(<strong key={`${keyPrefix}-b-${match.index}`}>{match[5]}</strong>)
    } else if (match[6]) {
      parts.push(<em key={`${keyPrefix}-i-${match.index}`}>{match[7]}</em>)
    } else if (match[8]) {
      parts.push(
        <code
          key={`${keyPrefix}-c-${match.index}`}
          className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs"
        >
          {match[9]}
        </code>
      )
    } else if (match[10]) {
      parts.push(
        <Link
          key={`${keyPrefix}-path-${match.index}`}
          to={match[10]}
          className="text-indigo-600 hover:text-indigo-800 font-medium underline"
        >
          View product
        </Link>
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < segment.length) {
    parts.push(segment.slice(lastIndex))
  }

  return parts.length ? parts : segment
}

function formatInline(text) {
  const rendered = renderTextSegment(text, 'inline')
  return Array.isArray(rendered) ? rendered : rendered
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

const TypingDots = () => (
  <div className="flex space-x-1.5 py-2 px-1">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
)

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const { userAuth } = useSelector((state) => state?.users)
  const isLoggedIn = userAuth?.isLoggedIn
  const userName = userAuth?.userInfo?.fullname

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  if (!isLoggedIn) return null

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMessage = { role: 'user', content: text }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const historyForApi = updatedMessages.slice(-20).slice(0, -1)

      const { data } = await axiosInstance.post('/chat/message', {
        message: text,
        history: historyForApi,
      })

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ])
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        'Sorry, I had trouble processing that. Please try again.'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errorMsg },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleChat = () => {
    setIsOpen((prev) => !prev)
    if (!isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Hi ${userName || 'there'}! 👋 I'm your ShopAI Assistant. I can help you with:\n\n• Checking your order status\n• Finding products\n• Active coupon codes & discounts\n• Your shipping addresses\n\nHow can I help you today?`,
        },
      ])
    }
  }

  return (
    <>
      {/* Floating action button */}
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

      {/* Chat panel */}
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
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-blue-800 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center">
                <ChatIcon />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">ShopAI Assistant</h3>
                <p className="text-xs text-blue-200">Always here to help</p>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="p-1.5 rounded-full hover:bg-blue-700 transition-colors focus:outline-none"
              aria-label="Close chat"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-800 text-white rounded-br-md whitespace-pre-wrap'
                      : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                  }`}
                >
                  {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-1.5 border border-gray-200">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-200">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about orders, products, coupons..."
                className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                style={{ maxHeight: '80px' }}
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
