import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'
import PolicyPageLayout from './PolicyPageLayout'

export default function ReturnRefundPolicyPage() {
  const [returnDays, setReturnDays] = useState(3)

  useEffect(() => {
    axiosInstance
      .get('/policy')
      .then(({ data }) => {
        const days = data?.policy?.returns?.windowDays
        if (days) setReturnDays(days)
      })
      .catch(() => {})
  }, [])

  return (
    <PolicyPageLayout
      title="Return & Refund Policy"
      subtitle="How to return items and when you can expect your money back."
    >
      <h2>Return window</h2>
      <p>
        You may request a return within <strong>{returnDays} days</strong> of delivery (from the
        date your order is marked <strong>delivered</strong> in your account). After that window
        closes, returns cannot be accepted through the website.
      </p>

      <h2>Eligible orders</h2>
      <ul>
        <li>Order status must be <strong>delivered</strong>.</li>
        <li>Items must be unused and in resalable condition with original packaging where possible.</li>
        <li>You can return one or more items from an order (partial returns are supported).</li>
      </ul>

      <h2>How to request a return</h2>
      <ol>
        <li>Sign in and open <Link to="/customer-profile">My Profile</Link>.</li>
        <li>Open the delivered order and choose <strong>Request Return</strong>.</li>
        <li>Select items, quantities, and a reason from the list (required).</li>
        <li>Submit — our team will review your request.</li>
      </ol>

      <h2>Return reasons</h2>
      <p>
        We ask why you are returning so we can improve products and service. Options include wrong
        item, damaged product, size issues, not as described, and more — plus an &quot;Other&quot;
        field when needed.
      </p>

      <h2>Approval &amp; refunds</h2>
      <p>
        Return requests are reviewed by our team. If approved, your refund is processed to your
        original payment method. Refunds typically appear within{' '}
        <strong>5–7 business days after approval</strong>.
      </p>
      <p>
        Refund amounts reflect any coupon discount applied at checkout (you are refunded what you
        actually paid for the returned items).
      </p>

      <h2>Return shipping</h2>
      <p>
        For now, customers arrange return shipping unless we specify otherwise in your approval
        message. Keep your proof of shipment until the refund is complete.
      </p>

      <h2>Cancellation vs return</h2>
      <p>
        To stop an order <em>before</em> it ships, use{' '}
        <Link to="/cancellation-policy">cancellation</Link>. Returns apply only after delivery.
      </p>

      <h2>Questions</h2>
      <p>
        Use <Link to="/assistant">Shop with AI</Link> for order status, or check your profile for
        return request updates.
      </p>
    </PolicyPageLayout>
  )
}
