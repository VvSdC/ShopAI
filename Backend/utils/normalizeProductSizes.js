import {
  SIZE_MEASUREMENT_TYPES,
  APPAREL_SIZE_PRESETS,
  DEFAULT_SIZE_LABELS,
} from '../constants/sizeMeasurement.js'
import { AppError } from './appError.js'

function cleanSizeList(sizes) {
  if (sizes == null) return []
  const list = Array.isArray(sizes) ? sizes : [sizes]
  return [...new Set(list.map((s) => String(s).trim()).filter(Boolean))]
}

export function defaultSizeLabelForType(type) {
  return DEFAULT_SIZE_LABELS[type] ?? 'Size'
}

export function productRequiresSizeSelection(product) {
  const type = product?.sizeMeasurementType ?? 'apparel'
  if (type === 'none') return false
  return (product?.sizes?.length || 0) > 1
}

/**
 * Validates and normalizes size fields for create/update.
 * @returns {{ sizeMeasurementType: string, sizeLabel: string, sizes: string[] }}
 */
export function normalizeProductSizes({
  sizeMeasurementType,
  sizeLabel,
  sizes,
}) {
  const type = String(sizeMeasurementType || 'apparel').trim().toLowerCase()
  if (!SIZE_MEASUREMENT_TYPES.includes(type)) {
    throw new AppError(
      `Invalid size measurement type. Use one of: ${SIZE_MEASUREMENT_TYPES.join(', ')}`,
      400
    )
  }

  const cleaned = cleanSizeList(sizes)

  if (type === 'none') {
    return {
      sizeMeasurementType: 'none',
      sizeLabel: '',
      sizes: [],
    }
  }

  const label =
    String(sizeLabel || '').trim() || defaultSizeLabelForType(type)

  if (!cleaned.length) {
    throw new AppError('Add at least one size value for this measurement type', 400)
  }

  if (type === 'apparel') {
    const invalid = cleaned.filter((s) => !APPAREL_SIZE_PRESETS.includes(s))
    if (invalid.length) {
      throw new AppError(
        `Invalid apparel sizes: ${invalid.join(', ')}. Allowed: ${APPAREL_SIZE_PRESETS.join(', ')}`,
        400
      )
    }
    return {
      sizeMeasurementType: 'apparel',
      sizeLabel: label,
      sizes: cleaned.filter((s) => APPAREL_SIZE_PRESETS.includes(s)),
    }
  }

  if (type === 'numeric') {
    const tooLong = cleaned.find((s) => s.length > 24)
    if (tooLong) {
      throw new AppError('Numeric size values must be 24 characters or fewer', 400)
    }
    return {
      sizeMeasurementType: 'numeric',
      sizeLabel: label,
      sizes: cleaned,
    }
  }

  // custom
  const tooLong = cleaned.find((s) => s.length > 48)
  if (tooLong) {
    throw new AppError('Custom size values must be 48 characters or fewer', 400)
  }

  return {
    sizeMeasurementType: 'custom',
    sizeLabel: label,
    sizes: cleaned,
  }
}
