import { resolvePaymentVerificationState, paymentVerificationErrorMessage } from './paymentVerification'

describe('paymentVerification', () => {
  it('shows verifying state before confirmation', () => {
    const ui = resolvePaymentVerificationState({
      sessionId: 'cs_test',
      verifying: true,
      verified: false,
      verificationError: '',
    })
    expect(ui.phase).toBe('verifying')
    expect(ui.showSuccessChrome).toBe(false)
  })

  it('shows success only after verified', () => {
    const ui = resolvePaymentVerificationState({
      sessionId: 'cs_test',
      verifying: false,
      verified: true,
      verificationError: '',
    })
    expect(ui.phase).toBe('success')
    expect(ui.showSuccessChrome).toBe(true)
    expect(ui.showProgress).toBe(true)
  })

  it('surfaces verification errors', () => {
    const ui = resolvePaymentVerificationState({
      sessionId: 'cs_test',
      verifying: false,
      verified: false,
      verificationError: 'Stripe unavailable',
    })
    expect(ui.phase).toBe('error')
    expect(ui.subtitle).toBe('Stripe unavailable')
  })

  it('maps API errors to user-facing text', () => {
    expect(
      paymentVerificationErrorMessage({
        response: { data: { message: 'Session not found' } },
      })
    ).toBe('Session not found')
  })
})
