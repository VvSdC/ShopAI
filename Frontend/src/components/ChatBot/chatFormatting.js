import { Link } from 'react-router-dom'

export function formatMessage(text) {
  if (!text) return text

  const lines = text.split('\n')
  const elements = []
  let listBuffer = []
  let listType = null

  const flushList = () => {
    if (listBuffer.length === 0) return
    const tag = listType === 'ol' ? 'ol' : 'ul'
    const listClass =
      tag === 'ol'
        ? 'list-decimal pl-5 my-1 space-y-0.5'
        : 'list-disc pl-5 my-1 space-y-0.5'
    const items = listBuffer.map((item, j) => (
      <li key={`li-${elements.length}-${j}`}>{formatInline(item)}</li>
    ))
    elements.push(
      tag === 'ol' ? (
        <ol key={`list-${elements.length}`} className={listClass}>
          {items}
        </ol>
      ) : (
        <ul key={`list-${elements.length}`} className={listClass}>
          {items}
        </ul>
      )
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
    /(\[([^\]]+)\]\((\/products\/[a-f0-9]{24}|https?:\/\/[^)]+)\))|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\/products\/[a-f0-9]{24})|(https:\/\/checkout\.stripe\.com\/[^\s)]+)/gi
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
    } else if (match[11]) {
      parts.push(
        <a
          key={`${keyPrefix}-stripe-${match.index}`}
          href={match[11]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 font-medium underline break-all"
        >
          Stripe checkout
        </a>
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < segment.length) {
    parts.push(segment.slice(lastIndex))
  }

  return parts.length ? parts : segment
}

export function formatInline(text) {
  const rendered = renderTextSegment(text, 'inline')
  return Array.isArray(rendered) ? rendered : rendered
}

export function TypingDots() {
  return (
    <div className="flex space-x-1.5 py-2 px-1">
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  )
}

export const AI_CHATBOT_LABEL = 'AI assistant'

export const AI_CHATBOT_DISCLOSURE =
  'You’re chatting with an AI assistant, not a person. Replies can be wrong — please check prices and order details before you pay.'

export function buildClientWelcomeMessage(userName) {
  const name = userName || 'there'
  return `Hi ${name}! 👋 I'm an **AI shopping assistant**. I can help you find products, update your cart, and checkout.

What are you looking for today?`
}

export const SUGGESTED_PROMPTS = [
  'Find a cricket ball',
  'Show my recent orders',
  'What is in my cart?',
  'Any active coupon codes?',
]
