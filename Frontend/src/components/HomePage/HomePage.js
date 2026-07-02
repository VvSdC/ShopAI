import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowPathIcon,
  ArrowRightIcon,
  TruckIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { fetchActiveCouponAction } from '../../redux/slices/coupons/couponsSlice'
import {
  isPromoActive,
  homepagePromoHeadline,
  homepagePromoSubline,
} from '../../utils/promoMessaging'
import HomeCategories from './HomeCategories'
import HomeProductTrending from './HomeProductTrending'
import HomeAiAssistantPromo from './HomeAiAssistantPromo'
import Reveal from './Reveal'

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
  const showCoupon = isPromoActive(coupon)
  const [codeCopied, setCodeCopied] = useState(false)

  const copyCouponCode = async () => {
    if (!coupon?.code) return
    try {
      await navigator.clipboard.writeText(coupon.code)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      setCodeCopied(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-stone-50">
      {/* Hero */}
      <section className="relative shrink-0 overflow-hidden bg-stone-900">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
            alt=""
            fetchpriority="high"
            decoding="async"
            className="h-full w-full scale-105 object-cover opacity-40 animate-fade-in"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-900/90 to-stone-900/40" />
        </div>

        {/* Decorative floating gradient orbs (motion-safe, hidden from AT) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl animate-float"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl animate-float-slow"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="max-w-xl">
            <p className="animate-fade-down text-sm font-semibold uppercase tracking-widest text-indigo-300">
              Welcome to ShopAI
            </p>
            <h1
              className="mt-3 animate-fade-up text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              Smart shopping,
              <span className="block bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
                made simple
              </span>
            </h1>
            <p
              className="mt-5 animate-fade-up text-lg leading-relaxed text-stone-300"
              style={{ animationDelay: '160ms' }}
            >
              Browse curated categories, discover trending products, and checkout with confidence.
            </p>
            <div
              className="mt-8 flex flex-wrap gap-3 animate-fade-up"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                to="/products-filters"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
              >
                Shop all products
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/all-categories"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
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
          {trustItems.map((item, i) => (
            <Reveal
              key={item.name}
              delay={i * 80}
              className="group flex items-center gap-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors duration-300 group-hover:bg-indigo-600 group-hover:text-white">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-stone-700">{item.name}</span>
            </Reveal>
          ))}
        </div>
      </section>

      <HomeAiAssistantPromo />

      {showCoupon && (
        <section className="overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600">
          <div className="mx-auto flex max-w-7xl animate-fade-up flex-col items-center justify-between gap-5 px-4 py-7 sm:flex-row sm:px-6 sm:text-left lg:px-8">
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-200">
                Limited-time offer
              </p>
              <p className="mt-1 text-xl font-bold text-white sm:text-2xl">
                {homepagePromoHeadline(coupon)}
              </p>
              <p className="mt-2 text-sm text-indigo-100">{homepagePromoSubline(coupon)}</p>
              <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="text-sm text-indigo-100">Coupon code</span>
                <span className="rounded-md bg-white/15 px-3 py-1.5 font-mono text-sm font-bold tracking-wide text-white ring-1 ring-white/25">
                  {coupon.code}
                </span>
                <button
                  type="button"
                  onClick={copyCouponCode}
                  className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
                >
                  {codeCopied ? 'Copied' : 'Copy code'}
                </button>
              </div>
            </div>
            <Link
              to="/products-filters"
              className="shrink-0 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-md"
            >
              Shop now
            </Link>
          </div>
        </section>
      )}

      {/* Categories — soft bg only, no divider lines (flows into trending below) */}
      <section className="bg-stone-50 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 hover:shadow-md"
            >
              View all categories
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>

          <div className="mt-6">
            <HomeCategories />
          </div>
        </div>
      </section>

      {/* Trending products */}
      <HomeProductTrending />

      {/* Bottom CTA */}
      <section className="relative mt-auto shrink-0 overflow-hidden bg-stone-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl animate-float-slow"
        />
        <Reveal className="relative mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to find your next favorite?</h2>
          <p className="mx-auto mt-3 max-w-lg text-stone-400">
            Explore the full catalog — new arrivals and customer favorites are waiting.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/products-filters"
              className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-xl"
            >
              Start shopping
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              to="/about"
              className="inline-flex rounded-xl border border-white/25 px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
            >
              About ShopAI
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
