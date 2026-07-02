import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import axiosInstance, { resetCsrfTokenCache } from '../../../utils/axiosInstance'
import { getCurrentUserAction } from '../../../redux/slices/users/usersSlice'

const STEPS = { OTP: 0, DONE: 1 }

export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [step, setStep] = useState(STEPS.OTP)
  const [email, setEmail] = useState(location.state?.email || '')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const otpRefs = useRef([])

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email)
    }
  }, [location.state?.email])

  const handleOTPChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1)
    if (value && !/^\d$/.test(value)) return
    const updated = [...otp]
    updated[index] = value
    setOtp(updated)
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOTPPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  const otpString = otp.join('')

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!email) return setError('Enter the email you signed up with.')
    if (otpString.length !== 6) return setError('Please enter the full 6-digit code')
    setLoading(true)
    setError('')
    try {
      await axiosInstance.post('/users/verify-email', { email, otp: otpString })
      resetCsrfTokenCache()
      await dispatch(getCurrentUserAction())
      setStep(STEPS.DONE)
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return setError('Enter your email address first.')
    setLoading(true)
    setError('')
    try {
      await axiosInstance.post('/users/resend-verification', { email })
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch {
      setError('Failed to resend code. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  if (step === STEPS.DONE) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-violet-50/40 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Email verified!</h2>
          <p className="text-gray-600">Taking you to ShopAI…</p>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-violet-50/40 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-violet-200/50">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Verify your email</h2>
          <p className="text-gray-500 mt-2 text-base">
            We sent a 6-digit code to secure your account and keep reviews trustworthy.
          </p>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-white/80 p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                Verification code
              </label>
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOTPPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOTPChange(i, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(i, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400 text-center">Expires in 10 minutes</p>
            </div>

            <button
              type="submit"
              disabled={loading || otpString.length !== 6}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all"
            >
              {loading ? 'Verifying…' : 'Verify & continue'}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-3 text-sm">
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || !email}
              className="font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50"
            >
              Resend code
            </button>
            <Link to="/login" className="text-gray-500 hover:text-gray-700">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
