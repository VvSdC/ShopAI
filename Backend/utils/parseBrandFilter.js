/** Parse repeated or comma-separated query values into a unique list. */
export function parseListFilterQuery(value) {
  if (value == null || value === '') return []
  const raw = Array.isArray(value) ? value : [value]
  const items = raw.flatMap((entry) =>
    String(entry)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
  return [...new Set(items)]
}

/** @deprecated Use parseListFilterQuery */
export const parseBrandFilterQuery = parseListFilterQuery

/** @deprecated Use parseListFilterQuery */
export const parseColorFilterQuery = parseListFilterQuery

/** MongoDB $in / equality match for one or many scalar or array field values. */
export function mongoInCondition(values) {
  const list = Array.isArray(values) ? values.filter(Boolean) : parseListFilterQuery(values)
  if (!list.length) return null
  if (list.length === 1) return list[0]
  return { $in: list }
}

/** @deprecated Use mongoInCondition */
export const brandMongoCondition = mongoInCondition
