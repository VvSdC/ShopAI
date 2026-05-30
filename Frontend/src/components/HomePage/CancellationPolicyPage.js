import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'
import PolicyPageLayout from './PolicyPageLayout'

export default function CancellationPolicyPage() {
  const [windowNote, setWindowNote] = useState('pending or processing')

  useEffect(() => {
    axiosInstance
      .get('/policy')
      .then(({ data }) => {
        const statuses = data?.policy?.cancellation?.allowedStatuses || []
        if (statuses.length) {
          setWindowNote(statuses.join(' or '))
        }
      })
      .catch(() => {})
  }, [])

  return (
    <PolicyPageLayout
      title="Cancellation Policy"
      subtitle="When and how you can cancel an order before it ships."
    >
      <h2>Before your order ships</h2>
      <p>
        You may cancel an order while it is still <strong>{windowNote}</strong> — that is,
        before it has been shipped. Once an order is shipped or delivered, cancellation is no
        longer available; you may be eligible for a return instead (see our{' '}
        <Link to="/return-refund-policy">Return &amp; Refund Policy</Link>).
      </p>

      <h2>How to cancel</h2>
      <ol>
        <li>Sign in to your ShopAI account.</li>
        <li>
          Go to <Link to="/customer-profile">My Profile</Link> and open your order details.
        </li>
        <li>
          If the order is eligible, tap <strong>Cancel Order</strong> and confirm.
        </li>
      </ol>
      <p>
        You can also ask our{' '}
        <Link to="/assistant">AI shopping assistant</Link> about order status — use the website
        for cancellations.
      </p>

      <h2>Refunds for cancelled orders</h2>
      <p>
        If you already paid and cancel before shipment, we process a full refund to your original
        payment method (via Stripe). Refunds typically appear within{' '}
        <strong>5–7 business days</strong>, depending on your bank or card issuer.
      </p>
      <p>
        Unpaid orders are simply cancelled — no charge is made.
      </p>

      <h2>What we cannot cancel</h2>
      <ul>
        <li>Orders that have already been shipped or marked delivered.</li>
        <li>Orders that have already been cancelled or fully refunded.</li>
      </ul>

      <h2>Need help?</h2>
      <p>
        If you cannot cancel in your account or believe there is an error, contact us through the
        assistant or your order confirmation email.
      </p>
    </PolicyPageLayout>
  )
}
