import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline'
import { formatMessage, TypingDots, buildClientWelcomeMessage } from './chatFormatting'
import AiDisclosureBanner from './AiDisclosureBanner'
import CheckoutPaymentCard from './CheckoutPaymentCard'
import { checkoutCardVisible } from './checkoutMessageHelpers'
import { useCheckoutHandlers } from './useCheckoutHandlers'
import { useShopAIChatActions } from './useShopAIChat'



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

  const [cartHint, setCartHint] = useState('')
  const [sessionId, setSessionId] = useState(null)

  const messagesEndRef = useRef(null)

  const inputRef = useRef(null)



  const { userAuth } = useSelector((state) => state?.users)

  const isLoggedIn = userAuth?.isLoggedIn

  const userName = userAuth?.userInfo?.fullname

  const { sendMessage, handleClientActions } = useShopAIChatActions()

  const { handleCheckoutPaid, handleCheckoutExpired } = useCheckoutHandlers(setMessages)



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



    const updatedMessages = [...messages, { role: 'user', content: text }]

    setMessages(updatedMessages)

    setInput('')

    setIsLoading(true)



    try {

      const data = await sendMessage({ text, sessionId: sessionId ?? undefined })
      if (data.sessionId) {
        setSessionId(data.sessionId)
      }

      const { cartSummary } = handleClientActions(data)

      if (cartSummary?.itemCount > 0) {
        setCartHint(
          `Cart: ${cartSummary.itemCount} unit${cartSummary.itemCount === 1 ? '' : 's'} — ₹${Number(cartSummary.total).toLocaleString('en-IN')}`
        )
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          checkout: data.checkout || null,
        },
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

          content: buildClientWelcomeMessage(userName) +
            '\n\nOpen **Shop with AI** in the navbar for full-screen chat with history.',

        },

      ])

    }

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

                to="/assistant"

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

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
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

            {isLoading && (

              <div className="flex justify-start">

                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-1.5 border border-gray-200">

                  <TypingDots />

                </div>

              </div>

            )}

            <div ref={messagesEndRef} />

          </div>



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


