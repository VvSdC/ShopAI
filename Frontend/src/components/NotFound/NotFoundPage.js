import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/40 px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          404
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 text-base text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist, was moved, or the URL
          may be mistyped.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
          >
            Go to home
          </Link>
          <Link
            to="/products-filters"
            className="inline-flex items-center justify-center rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-indigo-500 hover:text-indigo-600"
          >
            Browse products
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Need help?{' '}
          <Link to="/about" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Visit our about page
          </Link>
        </p>
      </div>
    </section>
  )
}
