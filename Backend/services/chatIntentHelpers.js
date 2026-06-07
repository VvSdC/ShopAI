export function conversationMentionsCheckoutPending(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'user') continue
    if (m.role === 'assistant') {
      return /checkout|proceed with payment|pay now|payment|stripe|ready for checkout|would you like to proceed|delivery address|shipping address/i.test(
        m.content || ''
      )
    }
  }
  return false
}

export function isAffirmativeReply(text) {
  return /^(yes|yeah|yep|yup|sure|ok|okay|confirm|confirmed|go ahead|please do|do it|sounds good)\b/i.test(
    String(text || '').trim()
  )
}

export function isCheckoutProceedIntent(text, messages = []) {
  const t = String(text || '')
  if (
    /\b(proceed|checkout|pay now|want to pay|ready to pay|place (?:my )?order|start payment)\b/i.test(t)
  ) {
    return true
  }
  if (isAffirmativeReply(t) && conversationMentionsCheckoutPending(messages)) {
    return true
  }
  return false
}
