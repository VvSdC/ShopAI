import React from 'react'
import { Link } from 'react-router-dom'

function ErrorFallback({
  title = 'Something went wrong',
  message = 'This section ran into an unexpected problem. You can try again or continue shopping.',
  onRetry,
  compact = false,
  error = null,
}) {
  const showDetails = process.env.NODE_ENV !== 'production' && error?.message

  if (compact) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <p className="font-medium">{title}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
          >
            Try again
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <section
      role="alert"
      className="flex min-h-[50vh] flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-stone-50 to-indigo-50/40 px-4 py-16"
    >
      <div className="w-full max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          ShopAI
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base text-stone-600">{message}</p>
        {showDetails ? (
          <p className="mt-3 break-words text-left text-xs text-stone-500 font-mono bg-stone-100 rounded-lg p-3">
            {error.message}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
            >
              Try again
            </button>
          ) : null}
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border-2 border-stone-200 px-6 py-3 text-sm font-semibold text-stone-700 transition hover:border-indigo-500 hover:text-indigo-600"
          >
            Go to home
          </Link>
          <Link
            to="/products-filters"
            className="inline-flex items-center justify-center rounded-xl border-2 border-stone-200 px-6 py-3 text-sm font-semibold text-stone-700 transition hover:border-indigo-500 hover:text-indigo-600"
          >
            Browse products
          </Link>
        </div>
      </div>
    </section>
  )
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleRetry = this.handleRetry.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, errorInfo?.componentStack)
    }
    this.props.onError?.(error, errorInfo)
  }

  componentDidUpdate(prevProps) {
    const { resetKey } = this.props
    if (
      this.state.hasError &&
      resetKey != null &&
      prevProps.resetKey !== resetKey
    ) {
      this.setState({ hasError: false, error: null })
    }
  }

  handleRetry() {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    const { hasError, error } = this.state
    const {
      children,
      fallback,
      title,
      message,
      compact = false,
    } = this.props

    if (!hasError) return children

    if (typeof fallback === 'function') {
      return fallback({ error, retry: this.handleRetry })
    }

    if (fallback) return fallback

    return (
      <ErrorFallback
        title={title}
        message={message}
        onRetry={this.handleRetry}
        compact={compact}
        error={error}
      />
    )
  }
}

export { ErrorFallback }
