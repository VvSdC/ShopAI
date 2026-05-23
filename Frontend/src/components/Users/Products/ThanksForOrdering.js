import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axiosInstance from '../../../utils/axiosInstance'

export default function ThanksForOrdering() {
  // clear cart items in localStorage
  localStorage.setItem('cartItems', JSON.stringify([]))
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [verified, setVerified] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState('')

  // Verify payment; backend ensures confirmation email is sent once (idempotent)
  useEffect(() => {
    if (!sessionId) return

    axiosInstance
      .get(`/orders/verify-payment/${sessionId}`)
      .then((res) => {
        setVerified(true)
        setEmailSent(res.data?.confirmationEmailSent === true)
        if (res.data?.emailTo) setEmailTo(res.data.emailTo)
      })
      .catch((err) => console.error('Payment verification failed:', err))
  }, [sessionId])

  const handleResendEmail = async () => {
    if (!sessionId || resending) return
    setResending(true)
    setResendError('')
    try {
      const res = await axiosInstance.post(
        `/orders/resend-confirmation/${sessionId}`
      )
      setEmailSent(true)
      if (res.data?.emailTo) setEmailTo(res.data.emailTo)
    } catch (err) {
      setResendError(
        err.response?.data?.message ||
          err.message ||
          'Could not resend email. Try again in a few minutes.'
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <>
      <section className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Animated Background Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-teal-200/30 rounded-full blur-[100px]" />
          <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-cyan-200/20 rounded-full blur-[80px]" />

          <svg
            className="absolute top-16 left-[10%] w-14 h-14 text-emerald-300/40 animate-bounce"
            style={{ animationDuration: '3s' }}
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <circle cx="50" cy="50" r="40" />
          </svg>
          <svg
            className="absolute top-24 right-[12%] w-10 h-10 text-teal-300/50"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <rect x="15" y="15" width="70" height="70" rx="15" />
          </svg>
          <svg
            className="absolute bottom-28 left-[8%] w-16 h-16 text-cyan-300/30 animate-pulse"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="50,10 90,80 10,80" />
          </svg>
          <svg
            className="absolute top-[45%] right-[8%] w-12 h-12 text-emerald-400/25"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="50" cy="50" r="45" strokeDasharray="8 8" />
          </svg>
          <svg
            className="absolute bottom-20 right-[18%] w-14 h-14 text-teal-300/35"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <rect x="20" y="20" width="60" height="60" rx="10" />
          </svg>
          <svg
            className="absolute top-[60%] left-[12%] w-8 h-8 text-cyan-400/40"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <circle cx="50" cy="50" r="50" />
          </svg>
          <svg
            className="absolute top-[30%] left-[45%] w-24 h-24 text-gray-300/40"
            viewBox="0 0 100 100"
          >
            {[...Array(16)].map((_, i) => (
              <circle
                key={i}
                cx={(i % 4) * 25 + 12.5}
                cy={Math.floor(i / 4) * 25 + 12.5}
                r="3"
                fill="currentColor"
              />
            ))}
          </svg>
          <svg
            className="absolute bottom-[35%] right-[10%] w-8 h-8 text-emerald-300/30"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <rect x="38" y="10" width="24" height="80" rx="6" />
            <rect x="10" y="38" width="80" height="24" rx="6" />
          </svg>
          <svg
            className="absolute top-[20%] left-[28%] w-20 h-20 text-teal-300/20"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M10,50 Q50,10 90,50" />
            <path d="M10,65 Q50,25 90,65" />
          </svg>
        </div>

        <div className="w-full max-w-lg relative z-10">
          {/* Success Animation Header */}
          <div className="text-center mb-8">
            <div
              className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-200/50 animate-bounce"
              style={{ animationDuration: '2s' }}
            >
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Payment Successful
            </div>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">
              Thank You!
            </h2>
            <p className="text-gray-500 mt-3 text-lg">
              Your order has been placed successfully
            </p>
          </div>

          {/* Order Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-white/80 p-8 lg:p-10">
            {/* Order Status */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${verified ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'}`}
                />
                <span
                  className={`text-sm font-semibold ${verified ? 'text-emerald-600' : 'text-amber-600'}`}
                >
                  {verified ? 'Payment Verified' : 'Verifying Payment...'}
                </span>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Order Progress
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  Step 1 of 4
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-1000"
                  style={{ width: '25%' }}
                />
              </div>
              <div className="flex justify-between mt-3">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto bg-emerald-500 rounded-full flex items-center justify-center mb-1">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    Ordered
                  </span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-1">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    Packed
                  </span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-1">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    Shipped
                  </span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-1">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    Delivered
                  </span>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="bg-emerald-50/80 rounded-2xl p-6 mb-8 border border-emerald-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">
                    {emailSent ? 'Confirmation email sent' : 'Order confirmed'}
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {emailSent
                      ? `We've emailed your order summary${emailTo ? ` to ${emailTo}` : ''}. You'll get tracking info when your order ships.`
                      : 'Your payment is confirmed. We could not confirm the email was sent — use resend below or check spam.'}
                  </p>
                  {!emailSent && sessionId && (
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={resending}
                      className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-800 underline disabled:opacity-50"
                    >
                      {resending ? 'Sending…' : 'Resend confirmation email'}
                    </button>
                  )}
                  {emailSent && sessionId && (
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={resending}
                      className="mt-3 block text-sm text-gray-500 hover:text-emerald-700 underline disabled:opacity-50"
                    >
                      {resending ? 'Sending…' : "Didn't get it? Resend email"}
                    </button>
                  )}
                  {resendError && (
                    <p className="mt-2 text-sm text-red-600">{resendError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                to="/"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
                <span>Continue Shopping</span>
              </Link>

              <Link
                to="/customer-profile"
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75"
                  />
                </svg>
                <span>View My Orders</span>
              </Link>
            </div>
          </div>

          {/* Support Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-3">
              Need help with your order?
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="mailto:support@shopai.in"
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-600 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                support@shopai.in
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="tel:+919876543210"
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-600 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
                +91 98765 43210
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
