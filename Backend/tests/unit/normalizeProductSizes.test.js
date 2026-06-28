import { describe, it, expect } from 'vitest'
import { AppError } from '../../utils/appError.js'
import {
  normalizeProductSizes,
  productRequiresSizeSelection,
  defaultSizeLabelForType,
} from '../../utils/normalizeProductSizes.js'

describe('normalizeProductSizes', () => {
  it('normalizes no-size products', () => {
    expect(
      normalizeProductSizes({
        sizeMeasurementType: 'none',
        sizes: ['S'],
      })
    ).toEqual({
      sizeMeasurementType: 'none',
      sizeLabel: '',
      sizes: [],
    })
  })

  it('normalizes apparel with default label', () => {
    expect(
      normalizeProductSizes({
        sizeMeasurementType: 'apparel',
        sizes: ['M', 'L'],
      })
    ).toEqual({
      sizeMeasurementType: 'apparel',
      sizeLabel: 'Size',
      sizes: ['M', 'L'],
    })
  })

  it('keeps custom size label for numeric products', () => {
    expect(
      normalizeProductSizes({
        sizeMeasurementType: 'numeric',
        sizeLabel: 'UK shoe size',
        sizes: ['7', '8', '9'],
      })
    ).toEqual({
      sizeMeasurementType: 'numeric',
      sizeLabel: 'UK shoe size',
      sizes: ['7', '8', '9'],
    })
  })

  it('rejects invalid apparel sizes', () => {
    expect(() =>
      normalizeProductSizes({
        sizeMeasurementType: 'apparel',
        sizes: ['42'],
      })
    ).toThrow(AppError)
  })

  it('requires at least one size when type is not none', () => {
    expect(() =>
      normalizeProductSizes({
        sizeMeasurementType: 'custom',
        sizes: [],
      })
    ).toThrow(AppError)
  })
})

describe('productRequiresSizeSelection', () => {
  it('returns false for no-size products', () => {
    expect(
      productRequiresSizeSelection({
        sizeMeasurementType: 'none',
        sizes: [],
      })
    ).toBe(false)
  })

  it('returns false when only one size is available', () => {
    expect(
      productRequiresSizeSelection({
        sizeMeasurementType: 'apparel',
        sizes: ['M'],
      })
    ).toBe(false)
  })

  it('returns true when multiple sizes are available', () => {
    expect(
      productRequiresSizeSelection({
        sizeMeasurementType: 'numeric',
        sizes: ['7', '8'],
      })
    ).toBe(true)
  })
})

describe('defaultSizeLabelForType', () => {
  it('returns numeric default label', () => {
    expect(defaultSizeLabelForType('numeric')).toBe('Size (numeric)')
  })
})
