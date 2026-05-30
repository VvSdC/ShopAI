import { Link, useLocation } from 'react-router-dom'

export default function SiteFooter() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/admin') || pathname === '/assistant') {
    return null
  }

  return (
    <footer className="mt-auto shrink-0 border-t border-stone-800 bg-stone-950 px-4 py-5 text-center text-sm text-stone-500 sm:px-6 lg:px-8">
      <p>© {new Date().getFullYear()} ShopAI. All rights reserved.</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        <Link to="/about" className="font-medium text-stone-400 hover:text-white">
          About
        </Link>
        <Link to="/cancellation-policy" className="font-medium text-stone-400 hover:text-white">
          Cancellation
        </Link>
        <Link to="/return-refund-policy" className="font-medium text-stone-400 hover:text-white">
          Returns &amp; Refunds
        </Link>
      </div>
    </footer>
  )
}
