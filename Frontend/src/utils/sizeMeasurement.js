export const SIZE_MEASUREMENT_TYPES = ['none', 'apparel', 'numeric', 'custom']

export const APPAREL_SIZE_PRESETS = ['S', 'M', 'L', 'XL', 'XXL']

export const SIZE_MEASUREMENT_TYPE_OPTIONS = [
  { value: 'none', label: 'No size' },
  { value: 'apparel', label: 'Standard clothing (S–XXL)' },
  { value: 'numeric', label: 'Numeric / measured' },
  { value: 'custom', label: 'Custom values' },
]

export const DEFAULT_SIZE_LABELS = {
  none: '',
  apparel: 'Size',
  numeric: 'Size (numeric)',
  custom: 'Size',
}

export const SIZE_LABEL_PLACEHOLDERS = {
  none: '',
  apparel: 'Size',
  numeric: 'e.g. UK shoe size, weight (kg)',
  custom: 'e.g. Variant, capacity, edition',
}

export function defaultSizeLabelForType(type) {
  return DEFAULT_SIZE_LABELS[type] ?? 'Size'
}

export function productRequiresSizeSelection(product) {
  const type = product?.sizeMeasurementType ?? 'apparel'
  if (type === 'none') return false
  return (product?.sizes?.length || 0) > 1
}

export function displaySizeLabel(product) {
  const type = product?.sizeMeasurementType ?? 'apparel'
  if (type === 'none') return ''
  return (product?.sizeLabel || defaultSizeLabelForType(type)).trim() || 'Size'
}

export function resolveCartSize(product, selectedSize) {
  const type = product?.sizeMeasurementType ?? 'apparel'
  if (type === 'none') return 'One Size'
  const sizes = product?.sizes || []
  if (selectedSize) return selectedSize
  if (sizes.length === 1) return sizes[0]
  return ''
}

export function buildSizePayload({ sizeMeasurementType, sizeLabel, sizes }) {
  const type = sizeMeasurementType || 'apparel'
  if (type === 'none') {
    return {
      sizeMeasurementType: 'none',
      sizeLabel: '',
      sizes: [],
    }
  }
  return {
    sizeMeasurementType: type,
    sizeLabel: (sizeLabel || defaultSizeLabelForType(type)).trim(),
    sizes: Array.isArray(sizes) ? sizes : [],
  }
}
