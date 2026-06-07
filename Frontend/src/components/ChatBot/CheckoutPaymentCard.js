import { useCheckoutPaymentPoll } from './useCheckoutPaymentPoll'

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function CheckoutPaymentCard({
  checkoutUrl,
  orderId,
  orderNumber,
  totalPrice,
  source = 'chat',
  paid = false,
  expired = false,
  onPaid,
  onExpired,
}) {
  const pollEnabled = Boolean(orderId && checkoutUrl && !paid && !expired)

  const { status, secondsRemaining } = useCheckoutPaymentPoll({
    orderId,
    enabled: pollEnabled,
    onPaid,
    onExpired,
  })

  const displayStatus = paid ? 'paid' : expired ? 'expired' : status

  if (!orderId) return null
  if (displayStatus === 'idle' && !checkoutUrl) return null

  if (displayStatus === 'paid') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
        <p className="text-sm font-semibold text-emerald-900">Payment received</p>
        <p className="mt-1 text-xs text-emerald-800">
          {orderNumber && <>Order <strong>#{orderNumber}</strong> is confirmed.</>}
          {source === 'chat'
            ? ' You can continue chatting below.'
            : ' See your order in My Profile.'}
        </p>
      </div>
    )
  }

  if (displayStatus === 'expired') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
        <p className="text-sm font-semibold text-amber-950">Payment link expired</p>
        <p className="mt-1 text-xs text-amber-900/90">
          The 5-minute payment window has ended. Ask me to start checkout again if you still want
          to pay.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-sm">
      <p className="text-sm font-semibold text-indigo-950">Complete your payment</p>
      <p className="mt-1 text-xs text-indigo-800/90">
        {orderNumber && <>Order <strong>#{orderNumber}</strong></>}
        {totalPrice != null && (
          <>
            {orderNumber ? ' · ' : ''}
            Total <strong>₹{Number(totalPrice).toLocaleString('en-IN')}</strong>
          </>
        )}
      </p>
      <p className="mt-2 text-xs text-indigo-700/80">
        Pay within <strong>{formatCountdown(secondsRemaining)}</strong>. We check every 20 seconds
        and will confirm automatically when payment completes.
      </p>
      <div className="mt-3">
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          Pay on Stripe
        </a>
      </div>
    </div>
  )
}
