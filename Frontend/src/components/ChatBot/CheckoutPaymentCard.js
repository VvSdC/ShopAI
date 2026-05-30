export default function CheckoutPaymentCard({ checkoutUrl, orderNumber, totalPrice, onDismiss }) {
  if (!checkoutUrl) return null

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
        Use the button below to open secure Stripe checkout. This link expires after a short time —
        request checkout again if needed.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          Pay on Stripe
        </a>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100/50"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
