import { useEffect, useState } from 'react'
import {
  TruckIcon,
  XCircleIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import axiosInstance from '../../utils/axiosInstance'
import PolicyPageLayout, {
  PolicySection,
  PolicySteps,
  PolicyList,
  PolicyLink,
  PolicyCta,
} from './PolicyPageLayout'
import { assistantStartNewState } from '../ChatBot/assistantNavigation'

export default function CancellationPolicyPage() {
  const [windowNote, setWindowNote] = useState('pending or processing')

  useEffect(() => {
    axiosInstance
      .get('/policy')
      .then(({ data }) => {
        const statuses = data?.policy?.cancellation?.allowedStatuses || []
        if (statuses.length) setWindowNote(statuses.join(' or '))
      })
      .catch(() => {})
  }, [])

  return (
    <PolicyPageLayout
      badge="ShopAI Policy"
      title="Cancellation Policy"
      subtitle="Cancel an order before it ships — we'll refund paid orders automatically through Stripe."
      seoPath="/cancellation-policy"
    >
      <PolicySection icon={TruckIcon} title="Before your order ships">
        <p>
          You may cancel while your order is still <strong className="text-stone-800">{windowNote}</strong> —
          that is, before it has been shipped. Once shipped or delivered, cancellation is not available;
          you may qualify for a return instead.
        </p>
        <p className="text-sm">
          See our <PolicyLink to="/return-refund-policy">Return &amp; Refund Policy</PolicyLink> for
          delivered orders.
        </p>
      </PolicySection>

      <PolicySection icon={ClipboardDocumentListIcon} title="How to cancel">
        <PolicySteps
          steps={[
            <>Sign in to your ShopAI account.</>,
            <>
              Open <PolicyLink to="/customer-profile">My Profile</PolicyLink> and find your order.
            </>,
            <>Tap <strong className="text-stone-800">Cancel Order</strong> and confirm.</>,
            <>
              Or ask <PolicyLink to="/assistant" state={assistantStartNewState}>Shop with AI</PolicyLink> — the assistant can cancel
              eligible orders in chat.
            </>,
          ]}
        />
      </PolicySection>

      <PolicySection icon={CreditCardIcon} title="Refunds for cancelled orders">
        <p>
          If you already paid and cancel before shipment, we issue a full refund to your original payment
          method via Stripe. Refunds typically appear within{' '}
          <strong className="text-stone-800">5–7 business days</strong>, depending on your bank.
        </p>
        <p>Unpaid orders are simply cancelled — no charge is made.</p>
      </PolicySection>

      <PolicySection icon={XCircleIcon} title="What we cannot cancel">
        <PolicyList
          items={[
            'Orders that have already been shipped or marked delivered.',
            'Orders that are already cancelled or fully refunded.',
          ]}
        />
      </PolicySection>

      <PolicyCta
        title="Need help with an order?"
        description="Check your orders, cancel before ship, or ask the assistant for order status."
        links={[
          { to: '/customer-profile', label: 'My Profile' },
          { to: '/assistant', label: 'Shop with AI', state: assistantStartNewState },
        ]}
      />

      <p className="text-center text-xs text-stone-500 flex items-center justify-center gap-1.5">
        <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden="true" />
        Questions? Use the assistant or your order confirmation email.
      </p>
    </PolicyPageLayout>
  )
}
