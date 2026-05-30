import { Link } from 'react-router-dom'

export default function PolicyPageLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-full bg-stone-50">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← Back to shop
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-base leading-relaxed text-stone-600">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="prose prose-stone max-w-none prose-headings:font-semibold prose-a:text-indigo-600">
          {children}
        </div>
      </div>
    </div>
  )
}
