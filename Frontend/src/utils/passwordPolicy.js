export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_HINT =
  'Must be at least 8 characters with letters & numbers'

export function validatePassword(password) {
  const value = String(password || '')
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Password must include letters and numbers'
  }
  return null
}
