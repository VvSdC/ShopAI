import { useEffect, useState } from 'react'
import {
  ClockIcon,
  CheckBadgeIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
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

export default function ReturnRefundPolicyPage() {
  const [returnDays, setReturnDays] = useState(3)
  const [reasons, setReasons] = useState([])

  useEffect(() => {
    axiosInstance
      .get('/policy')
      .then(({ data }) => {
        const days = data?.policy?.returns?.windowDays
        if (days) setReturnDays(days)
        if (data?.returnReasons?.length) setReasons(data.returnReasons)
      })
      .catch(() => {})
  }, [])

  return (
    <PolicyPageLayout
      badge="ShopAI Policy"
      title="Return & Refund Policy"
      subtitle="Return delivered items within our window — we'll review your request and refund after approval."
      accent="amber"
    >
      <PolicySection icon={ClockIcon} title={`${returnDays}-day return window`}>
        <p>
          You may request a return within <strong className="text-stone-800">{returnDays} days</strong> of
          delivery — from the date your order is marked <strong className="text-stone-800">delivered</strong>{' '}
          in your account. After that window closes, returns cannot be accepted online.
        </p>
      </PolicySection>

      <PolicySection icon={CheckBadgeIcon} title="Eligible orders">
        <PolicyList
          items={[
            'Order status must be delivered.',
            'Items should be unused and in resalable condition with original packaging where possible.',
            'Partial returns are supported — return one or more items from an order.',
          ]}
        />
      </PolicySection>

      <PolicySection icon={ClipboardDocumentListIcon} title="How to request a return">
        <PolicySteps
          steps={[
            <>Sign in and open <PolicyLink to="/customer-profile">My Profile</PolicyLink>.</>,
            <>Open the delivered order and choose <strong className="text-stone-800">Request Return</strong>.</>,
            <>Select items, quantities, and a reason from the list (required).</>,
            <>Submit — our team will review your request.</>,
            <>
              Or use <PolicyLink to="/assistant" state={assistantStartNewState}>Shop with AI</PolicyLink> to start a return in chat for
              eligible orders.
            </>,
          ]}
        />
      </PolicySection>

      {reasons.length > 0 && (
        <PolicySection icon={ArrowPathIcon} title="Return reasons">
          <p className="mb-3">We ask why you're returning so we can improve products and service:</p>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <span
                key={r.code}
                className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700"
              >
                {r.label}
              </span>
            ))}
          </div>
        </PolicySection>
      )}

      <PolicySection icon={CreditCardIcon} title="Approval & refunds">
        <p>
          Return requests are reviewed by our team. If approved, your refund is processed to your original
          payment method. Refunds typically appear within{' '}
          <strong className="text-stone-800">5–7 business days after approval</strong>.
        </p>
        <p>
          Refund amounts reflect any coupon discount at checkout — you are refunded what you actually paid
          for the returned items.
        </p>
      </PolicySection>

      <PolicySection icon={TruckIcon} title="Return shipping">
        <p>
          For now, customers arrange return shipping unless we specify otherwise in your approval message.
          Keep proof of shipment until your refund is complete.
        </p>
      </PolicySection>

      <PolicySection icon={ArrowPathIcon} title="Cancellation vs return">
        <p>
          To stop an order <em>before</em> it ships, use our{' '}
          <PolicyLink to="/cancellation-policy">Cancellation Policy</PolicyLink>. Returns apply only after
          delivery.
        </p>
      </PolicySection>

      <PolicyCta
        title="Ready to start a return?"
        description="View your orders in profile or ask the assistant if your order is eligible."
        links={[
          { to: '/customer-profile', label: 'My Profile' },
          { to: '/assistant', label: 'Shop with AI', state: assistantStartNewState },
        ]}
      />

      <p className="text-center text-xs text-stone-500 flex items-center justify-center gap-1.5">
        <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden="true" />
        Track return status in My Profile after you submit a request.
      </p>
    </PolicyPageLayout>
  )
}
