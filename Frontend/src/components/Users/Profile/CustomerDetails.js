import { CalendarIcon, EnvelopeIcon, UserCircleIcon } from '@heroicons/react/24/outline'

function initials(fullName) {
  if (!fullName) return '?'
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function CustomerDetails({ email, dateJoined, fullName }) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Your profile</h2>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
            {initials(fullName) || <UserCircleIcon className="h-8 w-8" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-stone-900">{fullName || 'Member'}</p>
            <p className="text-xs font-medium text-stone-500">ShopAI account</p>
          </div>
        </div>
        <dl className="mt-5 space-y-3 border-t border-stone-100 pt-4">
          <div className="flex items-start gap-3">
            <EnvelopeIcon className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Email</dt>
              <dd className="truncate text-sm text-stone-800">{email || '—'}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Member since
              </dt>
              <dd className="text-sm text-stone-800">{dateJoined || '—'}</dd>
            </div>
          </div>
        </dl>
      </div>
    </div>
  )
}
