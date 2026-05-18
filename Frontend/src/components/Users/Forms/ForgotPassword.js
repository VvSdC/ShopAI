import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import baseURL from '../../../utils/baseURL'

const STEPS = { EMAIL: 0, OTP: 1, NEW_PASSWORD: 2, DONE: 3 }

const ForgotPassword = () => {
  const [step, setStep] = useState(STEPS.EMAIL)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const otpRefs = useRef([])

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await axios.post(`${baseURL}/users/forgot-password`, { email })
      setStep(STEPS.OTP)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

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

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (otpString.length !== 6) return setError('Please enter the full 6-digit OTP')
    setLoading(true)
    setError('')
    try {
      await axios.post(`${baseURL}/users/verify-otp`, { email, otp: otpString })
      setStep(STEPS.NEW_PASSWORD)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirmPassword) return setError('Passwords do not match')
    setLoading(true)
    try {
      await axios.post(`${baseURL}/users/reset-password`, {
        email,
        otp: otpString,
        password,
      })
      setStep(STEPS.DONE)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setLoading(true)
    setError('')
    try {
      await axios.post(`${baseURL}/users/forgot-password`, { email })
      setOtp(['', '', '', '', '', ''])
      setError('')
      otpRefs.current[0]?.focus()
    } catch (err) {
      setError('Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  if (step === STEPS.DONE) {
    return (
      <section className="py-20 bg-gray-100 min-h-screen">
        <div className="container px-4 mx-auto max-w-lg">
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Password Reset!</h3>
            <p className="text-gray-600 mb-6">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <Link
              to="/login"
              className="inline-block bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-8 rounded-lg uppercase transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 bg-gray-100 min-h-screen">
      <div className="container px-4 mx-auto max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg p-10">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[0, 1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step >= s
                      ? 'bg-blue-800 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {s + 1}
                </div>
                {s < 2 && (
                  <div className={`w-8 h-0.5 ${step > s ? 'bg-blue-800' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Email */}
          {step === STEPS.EMAIL && (
            <>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h3>
              <p className="text-gray-500 mb-6 text-sm">
                Enter your email and we'll send you a 6-digit OTP to reset your password.
              </p>
              <form onSubmit={handleSendOTP}>
                <label className="block mb-6">
                  <span className="text-sm font-medium text-gray-700 mb-1 block">Email Address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                    placeholder="you@example.com"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold py-4 rounded-lg uppercase transition-colors"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            </>
          )}

          {/* Step 2: OTP */}
          {step === STEPS.OTP && (
            <>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enter OTP</h3>
              <p className="text-gray-500 mb-6 text-sm">
                We've sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
              </p>
              <form onSubmit={handleVerifyOTP}>
                <div className="flex justify-center gap-3 mb-6" onPaste={handleOTPPaste}>
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
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-colors"
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={loading || otpString.length !== 6}
                  className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold py-4 rounded-lg uppercase transition-colors"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                >
                  Didn't receive it? Resend OTP
                </button>
              </div>
            </>
          )}

          {/* Step 3: New Password */}
          {step === STEPS.NEW_PASSWORD && (
            <>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">New Password</h3>
              <p className="text-gray-500 mb-6 text-sm">Choose a strong password for your account.</p>
              <form onSubmit={handleResetPassword}>
                <label className="block mb-4">
                  <span className="text-sm font-medium text-gray-700 mb-1 block">New Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                    placeholder="At least 6 characters"
                  />
                </label>
                <label className="block mb-6">
                  <span className="text-sm font-medium text-gray-700 mb-1 block">Confirm Password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                    placeholder="Re-enter your password"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold py-4 rounded-lg uppercase transition-colors"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ForgotPassword
