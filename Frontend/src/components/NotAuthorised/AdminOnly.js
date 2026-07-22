import { Link } from 'react-router-dom'
import logo from '../Navbar/logo3.png'

export default function AdminOnly() {
  return (
    <div className="flex min-h-full flex-col bg-white pt-16 pb-12">
      <main className="mx-auto flex w-full max-w-7xl flex-grow flex-col justify-center px-6 lg:px-8">
        <div className="flex flex-shrink-0 justify-center">
          <Link to="/" className="inline-flex">
            <img className="h-12 w-auto" src={logo} alt="ShopAI logo" />
          </Link>
        </div>
        <div className="py-16">
          <div className="text-center">
            <p className="text-base font-semibold text-indigo-600">403</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Admin access required
            </h1>
            <p className="mt-2 text-base text-gray-500">
              Your account does not have permission to view this page.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/"
                className="text-base font-medium text-indigo-600 hover:text-indigo-500"
              >
                Go to storefront
                <span aria-hidden="true"> &rarr;</span>
              </Link>
              <Link
                to="/login"
                className="text-base font-medium text-gray-600 hover:text-gray-800"
              >
                Sign in with another account
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
