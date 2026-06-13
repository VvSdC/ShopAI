import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { registerUserAction } from '../../../redux/slices/users/usersSlice'
import { PASSWORD_HINT, PASSWORD_MIN_LENGTH, validatePassword } from '../../../utils/passwordPolicy'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import LoadingComponent from '../../LoadingComp/LoadingComponent'

const RegisterForm = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [validationError, setValidationError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
    phone: '',
    country: '',
  })
  const { fullname, email, password, phone, country } = formData
  const onChangeHandler = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }
  const onSubmitHandler = (e) => {
    e.preventDefault()
    setValidationError('')
    if (!agreedToTerms) {
      setValidationError('You must agree to the Terms of Service')
      return
    }
    const passwordError = validatePassword(password)
    if (passwordError) {
      setValidationError(passwordError)
      return
    }
    dispatch(registerUserAction({ fullname, email, password, phone, country }))
  }
  const { user, error, loading } = useSelector((state) => state?.users)
  useEffect(() => {
    if (user) {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  return (
    <>
      <section className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-violet-50/40 flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Animated Background Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-violet-200/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-fuchsia-200/30 rounded-full blur-[100px]" />
          <div className="absolute top-[40%] right-[40%] w-[300px] h-[300px] bg-purple-200/20 rounded-full blur-[80px]" />

          <svg className="absolute top-20 right-[12%] w-12 h-12 text-violet-300/40 animate-bounce" style={{ animationDuration: '5s' }} viewBox="0 0 100 100" fill="currentColor">
            <circle cx="50" cy="50" r="40" />
          </svg>
          <svg className="absolute top-28 left-[12%] w-8 h-8 text-fuchsia-300/50" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
            <rect x="15" y="15" width="70" height="70" rx="15" />
          </svg>
          <svg className="absolute bottom-28 right-[10%] w-16 h-16 text-violet-300/30 animate-pulse" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="50,10 90,80 10,80" />
          </svg>
          <svg className="absolute top-[50%] left-[6%] w-10 h-10 text-purple-400/25" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="50" cy="50" r="45" strokeDasharray="8 8" />
          </svg>
          <svg className="absolute bottom-24 left-[18%] w-14 h-14 text-fuchsia-300/35" viewBox="0 0 100 100" fill="currentColor">
            <rect x="20" y="20" width="60" height="60" rx="10" />
          </svg>
          <svg className="absolute top-[65%] right-[14%] w-6 h-6 text-violet-400/40" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="50" cy="50" r="50" />
          </svg>
          <svg className="absolute top-[35%] right-[45%] w-24 h-24 text-gray-300/40" viewBox="0 0 100 100">
            {[...Array(16)].map((_, i) => (
              <circle key={i} cx={(i % 4) * 25 + 12.5} cy={Math.floor(i / 4) * 25 + 12.5} r="3" fill="currentColor" />
            ))}
          </svg>
          <svg className="absolute bottom-[35%] left-[10%] w-8 h-8 text-purple-300/30" viewBox="0 0 100 100" fill="currentColor">
            <rect x="38" y="10" width="24" height="80" rx="6" />
            <rect x="10" y="38" width="80" height="24" rx="6" />
          </svg>
          <svg className="absolute top-[22%] right-[28%] w-20 h-20 text-violet-300/20" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M10,50 Q50,10 90,50" />
            <path d="M10,65 Q50,25 90,65" />
          </svg>
        </div>

        <div className="w-full max-w-lg relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-violet-200/50">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Create Account</h2>
            <p className="text-gray-500 mt-2 text-base">Join thousands of smart shoppers across India</p>
          </div>

          {/* Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-white/80 p-8 lg:p-10">
            {(error || validationError) && (
              <div className="mb-6">
                <ErrorMsg message={error?.message || validationError} />
              </div>
            )}

            <form onSubmit={onSubmitHandler} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <input name="fullname" value={fullname} onChange={onChangeHandler} className="w-full pl-12 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all duration-300" type="text" placeholder="Enter your full name" required minLength={2} autoComplete="name" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <input name="email" value={email} onChange={onChangeHandler} className="w-full pl-12 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all duration-300" type="email" placeholder="name@example.com" required autoComplete="email" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input name="password" value={password} onChange={onChangeHandler} className="w-full pl-12 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all duration-300" type="password" placeholder="Create a strong password" required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" />
                </div>
                <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  {PASSWORD_HINT}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Mobile Number</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                    </div>
                    <input name="phone" value={phone} onChange={onChangeHandler} className="w-full pl-12 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all duration-300" type="tel" placeholder="+91 98765 43210" required minLength={8} autoComplete="tel" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Country</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                    </div>
                    <input name="country" value={country} onChange={onChangeHandler} className="w-full pl-12 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all duration-300" type="text" placeholder="India" required minLength={2} autoComplete="country-name" />
                  </div>
                </div>
              </div>

              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded-lg border-gray-300 text-violet-600 focus:ring-violet-500/20 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition-colors leading-relaxed">
                  I agree to the <span className="font-semibold text-violet-600">Terms of Service</span> and <span className="font-semibold text-violet-600">Privacy Policy</span>
                </span>
              </label>

              <div className="pt-2">
                {loading ? (
                  <LoadingComponent />
                ) : (
                  <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                    <span>Create Account</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                )}
              </div>
            </form>

            <p className="text-center text-sm text-gray-600 mt-8 pt-6 border-t border-gray-100">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-violet-600 hover:text-violet-700 transition-colors">Sign in here</Link>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span>Your information is secure and encrypted</span>
          </div>
        </div>
      </section>
    </>
  )
}

export default RegisterForm