import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowPathIcon,
  ArrowRightIcon,
  TruckIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { fetchActiveCouponAction } from '../../redux/slices/coupons/couponsSlice'
import HomeCategories from './HomeCategories'
import HomeProductTrending from './HomeProductTrending'

const trustItems = [
  { name: 'Easy returns', icon: ArrowPathIcon },
  { name: 'Fast dispatch', icon: TruckIcon },
  { name: 'Secure checkout', icon: ShieldCheckIcon },
  { name: 'Quality picks', icon: SparklesIcon },
]

export default function HomePage() {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(fetchActiveCouponAction())
  }, [dispatch])

  const { activeCoupon: coupon } = useSelector((state) => state?.coupons)
  const showCoupon = coupon && !coupon.isExpired

  return (
    <div className="flex min-h-full flex-col bg-stone-50">
      {/* Hero */}
      <section className="relative shrink-0 overflow-hidden bg-stone-900">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-900/90 to-stone-900/40" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">
              Welcome to ShopAI
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Smart shopping,
              <span className="block text-indigo-300">made simple</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-300">
              Browse curated categories, discover trending products, and checkout with confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products-filters"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500"
              >
                Shop all products
              </Link>
              <Link
                to="/all-categories"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Browse categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-5 sm:grid-cols-4 sm:px-6 lg:px-8">
          {trustItems.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <item.icon className="h-6 w-6 shrink-0 text-indigo-600" aria-hidden="true" />
              <span className="text-sm font-medium text-stone-700">{item.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Flash sale / coupon */}
      {showCoupon && (
        <section className="bg-indigo-600">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-200">
                Limited time
              </p>
              <p className="mt-1 text-xl font-bold text-white sm:text-2xl">
                Flash sale — {coupon.discount}% off
              </p>
              <p className="mt-1 text-sm text-indigo-100">{coupon.daysLeft}</p>
            </div>
            <Link
              to="/products-filters"
              className="shrink-0 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              Shop the sale
            </Link>
          </div>
        </section>
      )}

      {/* Categories — soft bg only, no divider lines (flows into trending below) */}
      <section className="bg-stone-50 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
                Collections
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                Shop by category
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600 sm:text-base">
                Jump into our most-shopped collections — curated and ready to browse.
              </p>
            </div>
            <Link
              to="/all-categories"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
            >
              View all categories
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6">
            <HomeCategories />
          </div>
        </div>
      </section>

      {/* Trending products */}
      <HomeProductTrending />

      {/* Bottom CTA */}
      <section className="mt-auto shrink-0 bg-stone-900">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to find your next favorite?</h2>
          <p className="mx-auto mt-3 max-w-lg text-stone-400">
            Explore the full catalog — new arrivals and customer favorites are waiting.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/products-filters"
              className="inline-flex rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Start shopping
            </Link>
            <Link
              to="/about"
              className="inline-flex rounded-xl border border-white/25 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              About ShopAI
            </Link>
          </div>
        </div>
        <footer className="border-t border-stone-800 bg-stone-950 px-4 py-5 text-center text-sm text-stone-500 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} ShopAI. All rights reserved.</p>
          <Link to="/about" className="mt-2 inline-block font-medium text-stone-400 hover:text-white">
            Learn more about us
          </Link>
        </footer>
      </section>
    </div>
  )
}
