import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_HINT,
  validatePassword,
} from './passwordPolicy'

describe('passwordPolicy', () => {
  it('accepts valid passwords', () => {
    expect(validatePassword('secure12')).toBeNull()
  })

  it('rejects short passwords', () => {
    expect(validatePassword('abc12')).toBe(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    )
  })

  it('rejects passwords without letters or numbers', () => {
    expect(validatePassword('12345678')).toBe(
      'Password must include letters and numbers'
    )
    expect(validatePassword('abcdefgh')).toBe(
      'Password must include letters and numbers'
    )
  })

  it('documents the shared hint', () => {
    expect(PASSWORD_HINT).toContain('8')
  })
})
