import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowPathIcon,
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

const perks = [
  {
    name: 'Hassle-free returns',
    description: 'Damaged or wrong item? We make returns simple so you can shop with confidence.',
  },
  {
    name: 'Quick delivery',
    description: 'Orders are packed and shipped fast — get what you love without the long wait.',
  },
  {
    name: 'Best-value deals',
    description: 'Watch for flash sales and seasonal offers on trending products across categories.',
  },
  {
    name: 'Curated for you',
    description: 'Fresh products added regularly. Discover something new every time you visit.',
  },
]

export default function HomePage() {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(fetchActiveCouponAction())
  }, [dispatch])

  const { activeCoupon: coupon } = useSelector((state) => state?.coupons)
  const showCoupon = coupon && !coupon.isExpired

  return (
    <div className="bg-stone-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-stone-900">
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

      {/* Categories */}
      <section className="relative overflow-hidden bg-stone-50 py-14 sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-violet-200/30 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Collections
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl lg:text-4xl">
              Shop by category
            </h2>
            <p className="mt-2 max-w-md text-stone-600">
              Our most popular collections — pick a category and start browsing.
            </p>
          </div>
          <Link
            to="/all-categories"
            className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:inline-flex sm:items-center sm:gap-1"
          >
            View all
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <HomeCategories />
        <Link
          to="/all-categories"
          className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-stone-900 py-3.5 text-sm font-semibold text-white hover:bg-stone-800 sm:hidden"
        >
          View all categories
        </Link>
        </div>
      </section>

      {/* Trending products */}
      <HomeProductTrending />

      {/* Why ShopAI */}
      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Why shop with us</h2>
            <p className="mx-auto mt-2 max-w-2xl text-stone-600">
              Everything you expect from a modern store — clear pricing, easy browsing, and support
              you can trust.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map((perk, i) => {
              const Icon = trustItems[i]?.icon || SparklesIcon
              return (
                <div
                  key={perk.name}
                  className="rounded-2xl border border-stone-200/80 bg-stone-50 p-6 text-center sm:text-left"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 sm:mx-0">
                    <Icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="mt-4 font-semibold text-stone-900">{perk.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{perk.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to find your next favorite?</h2>
          <p className="mx-auto mt-3 max-w-lg text-stone-400">
            Explore the full catalog — new arrivals and customer favorites are waiting.
          </p>
          <Link
            to="/products-filters"
            className="mt-8 inline-flex rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Start shopping
          </Link>
        </div>
      </section>
    </div>
  )
}
