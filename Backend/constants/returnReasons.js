export const RETURN_REASONS = [
  { code: 'wrong_item', label: 'Wrong item received' },
  { code: 'damaged', label: 'Damaged or defective' },
  { code: 'size_fit', label: 'Size / fit issue' },
  { code: 'not_as_described', label: 'Not as described' },
  { code: 'poor_quality', label: 'Quality not as expected' },
  { code: 'late_delivery', label: 'Arrived too late' },
  { code: 'ordered_by_mistake', label: 'Ordered by mistake' },
  { code: 'better_price', label: 'Found better price elsewhere' },
  { code: 'missing_parts', label: 'Missing parts or accessories' },
  { code: 'changed_mind', label: 'Changed my mind' },
  { code: 'other', label: 'Other' },
]

export const RETURN_REASON_CODES = new Set(RETURN_REASONS.map((r) => r.code))

export function getReturnReasonLabel(code) {
  return RETURN_REASONS.find((r) => r.code === code)?.label || code
}
