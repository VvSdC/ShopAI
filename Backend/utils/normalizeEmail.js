/** Canonical email form for storage and lookups — always lowercase + trimmed. */
export function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim()
}
