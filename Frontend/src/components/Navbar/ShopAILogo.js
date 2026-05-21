import { Link } from 'react-router-dom'

export default function ShopAILogo({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm ring-1 ring-indigo-500/30 transition group-hover:bg-indigo-700">
        <svg
          className="h-6 w-6 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m7.5 0v4.5m-7.5-4.5h15m-7.5 0V18a2.25 2.25 0 002.25 2.25h3.375c1.035 0 1.875-.84 1.875-1.875V10.5M7.5 21h9"
          />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-lg font-bold tracking-tight text-gray-900 group-hover:text-indigo-600 transition-colors">
            ShopAI
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-600">
            Smart shopping
          </span>
        </span>
      )}
    </Link>
  )
}
