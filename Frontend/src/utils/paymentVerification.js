/**
 * Map verify-payment API response / errors to UI state.
 */
export function resolvePaymentVerificationState({
  sessionId,
  verifying,
  verified,
  verificationError,
}) {
  if (!sessionId) {
    return {
      phase: 'missing_session',
      title: 'Payment status unknown',
      subtitle: 'No payment session was found. If you completed checkout, check your orders.',
      showSuccessChrome: false,
      showProgress: false,
    }
  }

  if (verifying) {
    return {
      phase: 'verifying',
      title: 'Verifying payment…',
      subtitle: 'Please wait while we confirm your payment with Stripe.',
      showSuccessChrome: false,
      showProgress: false,
    }
  }

  if (verificationError) {
    return {
      phase: 'error',
      title: 'Could not verify payment',
      subtitle: verificationError,
      showSuccessChrome: false,
      showProgress: false,
    }
  }

  if (verified) {
    return {
      phase: 'success',
      title: 'Thank you!',
      subtitle: 'Your order has been placed successfully',
      showSuccessChrome: true,
      showProgress: true,
    }
  }

  return {
    phase: 'pending',
    title: 'Verifying payment…',
    subtitle: 'Please wait while we confirm your payment.',
    showSuccessChrome: false,
    showProgress: false,
  }
}

export function paymentVerificationErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.message ||
    'We could not verify your payment. Try again or check your orders.'
  )
}
