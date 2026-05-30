import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { AI_CHATBOT_DISCLOSURE } from './chatFormatting'

export default function AiDisclosureBanner({ compact = false }) {
  if (compact) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900">
        {AI_CHATBOT_DISCLOSURE}
      </p>
    )
  }

  return (
    <div
      className="flex gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="note"
      aria-label="AI chatbot disclosure"
    >
      <InformationCircleIcon className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
      <p className="leading-relaxed">{AI_CHATBOT_DISCLOSURE}</p>
    </div>
  )
}
