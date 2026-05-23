import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  getCurrentUserAction,
  loginUserAction,
} from '../../../redux/slices/users/usersSlice'
import ErrorMsg from '../../ErrorMsg/ErrorMsg'
import LoadingComponent from '../../LoadingComp/LoadingComponent'

const Login = () => {
  const dispatch = useDispatch()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const { email, password } = formData
  const onChangeHandler = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }
  const onSubmitHandler = (e) => {
    e.preventDefault()
    dispatch(loginUserAction({ email, password }))
  }
  const { error, loading, isLoggedIn } = useSelector(
    (state) => state?.users?.userAuth,
  )
  useEffect(() => {
    if (isLoggedIn) {
      dispatch(getCurrentUserAction()).then(() => {
        window.location.href = '/'
      })
    }
  }, [isLoggedIn, dispatch])

  return (
    <>
      <section className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/40 flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Animated Background Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-[100px]" />
          <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-blue-200/20 rounded-full blur-[80px]" />

          <svg
            className="absolute top-16 left-[10%] w-12 h-12 text-indigo-300/40 animate-bounce"
            style={{ animationDuration: '4s' }}
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <circle cx="50" cy="50" r="40" />
          </svg>
          <svg
            className="absolute top-24 right-[15%] w-8 h-8 text-purple-300/50"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <rect x="15" y="15" width="70" height="70" rx="15" />
          </svg>
          <svg
            className="absolute bottom-32 left-[8%] w-16 h-16 text-blue-300/30 animate-pulse"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="50,10 90,80 10,80" />
          </svg>
          <svg
            className="absolute top-[45%] right-[8%] w-10 h-10 text-indigo-400/25"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="50" cy="50" r="45" strokeDasharray="8 8" />
          </svg>
          <svg
            className="absolute bottom-20 right-[20%] w-14 h-14 text-violet-300/35"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <rect x="20" y="20" width="60" height="60" rx="10" />
          </svg>
          <svg
            className="absolute top-[60%] left-[15%] w-6 h-6 text-purple-400/40"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <circle cx="50" cy="50" r="50" />
          </svg>
          <svg
            className="absolute top-[30%] left-[50%] w-24 h-24 text-gray-300/40"
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
            className="absolute bottom-[40%] right-[12%] w-8 h-8 text-indigo-300/30"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <rect x="38" y="10" width="24" height="80" rx="6" />
            <rect x="10" y="38" width="80" height="24" rx="6" />
          </svg>
          <svg
            className="absolute top-[20%] left-[25%] w-20 h-20 text-blue-300/20"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M10,50 Q50,10 90,50" />
            <path d="M10,65 Q50,25 90,65" />
          </svg>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-indigo-200/50">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-gray-500 mt-2 text-base">
              Sign in to your ShopAI account
            </p>
          </div>

          {/* Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-white/80 p-8 lg:p-10">
            {error && (
              <div className="mb-6">
                <ErrorMsg message={error?.message} />
              </div>
            )}

            <form onSubmit={onSubmitHandler} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors"
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
                  <input
                    name="email"
                    value={email}
                    onChange={onChangeHandler}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all duration-300"
                    type="email"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                  </div>
                  <input
                    name="password"
                    value={password}
                    onChange={onChangeHandler}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all duration-300"
                    type="password"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    Remember me
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="pt-2">
                {loading ? (
                  <LoadingComponent />
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <span>Sign In</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </form>

            <p className="text-center text-sm text-gray-600 mt-8 pt-6 border-t border-gray-100">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Create one now
              </Link>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <span>End-to-end encrypted & secure</span>
          </div>
        </div>
      </section>
    </>
  )
}

export default Login
