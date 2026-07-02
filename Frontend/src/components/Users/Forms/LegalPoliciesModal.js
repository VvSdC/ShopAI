import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from '../../../content/legalPolicies'

const TABS = [
  { id: 'terms', label: 'Terms of Service', doc: TERMS_OF_SERVICE },
  { id: 'privacy', label: 'Privacy Policy', doc: PRIVACY_POLICY },
]

export default function LegalPoliciesModal({ open, initialTab = 'terms', onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (open) setActiveTab(initialTab)
  }, [open, initialTab])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const current = TABS.find((t) => t.id === activeTab) || TABS[0]
  const { doc } = current

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
        <div
          className="relative flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-policies-title"
        >
          <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-6">
            <div>
              <h2 id="legal-policies-title" className="text-lg font-bold text-stone-900 sm:text-xl">
                Legal policies
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">Last updated {doc.updated}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex gap-1 border-b border-stone-100 bg-stone-50/80 px-4 pt-2 sm:px-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-violet-700 shadow-sm ring-1 ring-stone-200/80'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <h3 className="text-base font-semibold text-stone-900">{doc.title}</h3>
            <div className="mt-4 space-y-5">
              {doc.sections.map((section) => (
                <section key={section.heading}>
                  <h4 className="text-sm font-semibold text-stone-800">{section.heading}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{section.body}</p>
                </section>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-200 bg-stone-50 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
