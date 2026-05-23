import { Link } from 'react-router-dom'
import {
  ArrowPathIcon,
  ArrowRightIcon,
  TruckIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'

const pillars = [
  {
    name: 'Easy returns',
    description: 'Simple return process if something isn’t right — shop with confidence.',
    icon: ArrowPathIcon,
  },
  {
    name: 'Fast dispatch',
    description: 'Orders packed and shipped quickly so you get what you ordered sooner.',
    icon: TruckIcon,
  },
  {
    name: 'Secure checkout',
    description: 'Protected payments and a checkout flow designed to keep your data safe.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Quality picks',
    description: 'Products curated across categories so you spend less time searching.',
    icon: SparklesIcon,
  },
]

const promises = [
  {
    name: 'Hassle-free returns',
    description:
      'Damaged or wrong item? We make returns straightforward so you can shop with peace of mind.',
    icon: ArrowPathIcon,
  },
  {
    name: 'Quick delivery',
    description: 'Orders are packed and shipped fast — get what you love without the long wait.',
    icon: TruckIcon,
  },
  {
    name: 'Best-value deals',
    description: 'Flash sales and seasonal offers on trending products across categories.',
    icon: SparklesIcon,
  },
  {
    name: 'Curated for you',
    description: 'Fresh products added regularly. Discover something new every time you visit.',
    icon: ShoppingBagIcon,
  },
]

const steps = [
  {
    step: '01',
    title: 'Browse & discover',
    description: 'Explore categories, filters, and trending picks tailored to what shoppers love.',
    icon: MagnifyingGlassIcon,
  },
  {
    step: '02',
    title: 'Checkout securely',
    description: 'Add to cart, apply offers when available, and pay through a secure checkout.',
    icon: ShieldCheckIcon,
  },
  {
    step: '03',
    title: 'Get help anytime',
    description: 'Track orders and ask our assistant about products, coupons, and your account.',
    icon: ChatBubbleLeftRightIcon,
  },
]

const stats = [
  { label: 'Curated categories', value: 'Wide range' },
  { label: 'Shopping experience', value: 'Built for you' },
  { label: 'Support', value: 'Always on' },
]

export default function AboutPage() {
  return (
    <div className="bg-stone-50">
      {/* Hero — matches homepage tone */}
      <section className="relative overflow-hidden bg-stone-900">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556745757-5d37106e5b0e?auto=format&fit=crop&w=1600&q=80"
            alt=""
            className="h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-900/95 to-stone-900/50" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-200 ring-1 ring-indigo-400/30">
              About ShopAI
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Smart shopping,
              <span className="block text-indigo-300">made simple</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-stone-300 sm:text-lg">
              We built ShopAI to make online shopping clear, fast, and trustworthy — from discovery
              to delivery.
            </p>
          </div>
        </div>
      </section>

      {/* Mission — split layout like leading brand About pages */}
      <section className="bg-white py-10 sm:py-12 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                Our story
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                A store designed around how you actually shop
              </h2>
              <p className="mt-4 text-base leading-relaxed text-stone-600">
                ShopAI brings together curated products, transparent pricing, and tools that help
                you find what you need — whether you are browsing categories, checking trending
                items, or asking our shopping assistant for help.
              </p>
              <p className="mt-4 text-base leading-relaxed text-stone-600">
                We focus on the details that matter: easy navigation, secure checkout, reliable
                dispatch, and support when you need it.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 lg:gap-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4 text-center lg:text-left"
                >
                  <p className="text-lg font-bold text-stone-900">{item.value}</p>
                  <p className="mt-1 text-sm text-stone-600">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core pillars — same visual language as homepage trust strip */}
      <section className="bg-stone-50 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              What we stand for
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Built on trust, speed, and quality
            </h2>
            <p className="mt-2 text-stone-600">
              The principles behind every order, listing, and interaction on ShopAI.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {pillars.map((item) => (
              <div
                key={item.name}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
                  <item.icon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-stone-900">{item.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — 3-step journey */}
      <section className="bg-white py-10 sm:py-12 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              How it works
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              From browse to doorstep
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-stone-600">
              A straightforward path — no clutter, no confusion.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center md:text-left"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Step {item.step}
                </span>
                <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 md:mx-0">
                  <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-stone-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promise grid — detail cards */}
      <section className="bg-stone-50 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Our promise
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Why shoppers choose ShopAI
            </h2>
            <p className="mt-2 text-stone-600">
              Clear pricing, easy browsing, and support you can rely on — every visit.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:gap-5">
            {promises.map((perk) => (
              <div
                key={perk.name}
                className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                  <perk.icon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">{perk.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{perk.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — matches homepage footer block */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to start shopping?</h2>
          <p className="mx-auto mt-3 max-w-lg text-stone-400">
            Explore the full catalog — categories, trending products, and offers are waiting.
          </p>
          <Link
            to="/products-filters"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Explore the store
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <p className="mt-4">
            <Link to="/" className="text-sm font-medium text-stone-500 transition hover:text-white">
              ← Back to home
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
