import { useLocation } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary'

/** Resets when the route changes so navigation recovers from a broken page. */
export default function RouteErrorBoundary({ children, title, message }) {
  const { pathname } = useLocation()

  return (
    <ErrorBoundary
      resetKey={pathname}
      title={title || 'This page hit a snag'}
      message={
        message ||
        'Part of this page could not be displayed. Try again or keep shopping — the rest of ShopAI is still available.'
      }
    >
      {children}
    </ErrorBoundary>
  )
}
