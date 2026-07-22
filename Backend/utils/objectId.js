/** 24-char hex only — mongoose isValidObjectId is too permissive for route params. */
export function isValidObjectId(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || '').trim())
}
