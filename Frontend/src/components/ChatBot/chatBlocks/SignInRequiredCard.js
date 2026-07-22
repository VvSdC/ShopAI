import { Link, useNavigate } from 'react-router-dom'
import { storePendingChatQuery } from '../pendingChatQuery'

export default function SignInRequiredCard({
  pendingQuery = null,
  returnPath = '/assistant',
  disabled = false,
}) {
  const navigate = useNavigate()

  const handleSignIn = () => {
    if (disabled) return
    if (pendingQuery) {
      storePendingChatQuery(pendingQuery, returnPath)
    }
    navigate('/login', { state: { from: { pathname: returnPath } } })
  }

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/80 p-4">
      <p className="text-sm font-medium text-indigo-950">Sign in to continue</p>
      <p className="mt-1 text-xs text-indigo-800/90">
        Orders, checkout, addresses, and payment require an account. Your cart stays saved on this
        device.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleSignIn}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign in
        </button>
        <Link
          to="/register"
          state={{ from: { pathname: returnPath } }}
          className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50"
        >
          Create account
        </Link>
      </div>
    </div>
  )
}
