import { Link } from 'react-router-dom'
import PageSeo from '../common/PageSeo'

export function PolicyHero({ badge, title, subtitle, accent = 'indigo' }) {
  const badgeClass =
    accent === 'amber'
      ? 'bg-amber-500/20 text-amber-200 ring-amber-400/30'
      : 'bg-indigo-500/20 text-indigo-200 ring-indigo-400/30'

  return (
    <section className="relative overflow-hidden bg-stone-900">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1600&q=80"
          alt=""
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-900/95 to-stone-900/60" />
      </div>
      <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-stone-400 hover:text-white transition-colors"
        >
          ← Back to shop
        </Link>
        <span
          className={`mt-6 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1 ${badgeClass}`}
        >
          {badge}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-300 sm:text-lg">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}

export function PolicySection({ icon: Icon, title, children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8 ${className}`}
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">{title}</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-stone-600 sm:text-base">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

export function PolicySteps({ steps }) {
  return (
    <ol className="mt-2 space-y-3">
      {steps.map((step, i) => (
        <li key={step} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {i + 1}
          </span>
          <span className="pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  )
}

export function PolicyList({ items }) {
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function PolicyLink({ to, state, children }) {
  return (
    <Link
      to={to}
      state={state}
      className="font-medium text-indigo-600 hover:text-indigo-500 underline-offset-2 hover:underline"
    >
      {children}
    </Link>
  )
}

export function PolicyCta({ title, description, links }) {
  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-base">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {links.map((link) => (
          <Link
            key={link.to + (link.label || '')}
            to={link.to}
            state={link.state}
            className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function PolicyPageLayout({
  badge,
  title,
  subtitle,
  accent,
  seoPath = '/',
  children,
}) {
  return (
    <div className="min-h-full bg-stone-50">
      <PageSeo title={title} description={subtitle} path={seoPath} />
      <PolicyHero badge={badge} title={title} subtitle={subtitle} accent={accent} />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  )
}
