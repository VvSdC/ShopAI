import { describe, it, expect } from 'vitest'
import {
  parseListFilterQuery,
  parseBrandFilterQuery,
  parseColorFilterQuery,
  mongoInCondition,
  brandMongoCondition,
} from '../../utils/parseBrandFilter.js'

describe('parseListFilterQuery', () => {
  it('returns empty for missing input', () => {
    expect(parseListFilterQuery(undefined)).toEqual([])
    expect(parseListFilterQuery('')).toEqual([])
  })

  it('parses a single value', () => {
    expect(parseListFilterQuery('Nike')).toEqual(['Nike'])
  })

  it('parses repeated query params', () => {
    expect(parseListFilterQuery(['Nike', 'Adidas'])).toEqual(['Nike', 'Adidas'])
  })

  it('parses comma-separated values and dedupes', () => {
    expect(parseListFilterQuery('Nike, Adidas, Nike')).toEqual(['Nike', 'Adidas'])
  })

  it('aliases color and brand parsers', () => {
    expect(parseColorFilterQuery(['Red', 'Blue'])).toEqual(['Red', 'Blue'])
    expect(parseBrandFilterQuery(['Red', 'Blue'])).toEqual(['Red', 'Blue'])
  })
})

describe('mongoInCondition', () => {
  it('returns null when no values', () => {
    expect(mongoInCondition([])).toBeNull()
  })

  it('returns a string for one value', () => {
    expect(mongoInCondition(['Nike'])).toBe('Nike')
  })

  it('returns $in for multiple values', () => {
    expect(mongoInCondition(['Nike', 'Adidas'])).toEqual({ $in: ['Nike', 'Adidas'] })
  })

  it('aliases brandMongoCondition', () => {
    expect(brandMongoCondition(['Red', 'Blue'])).toEqual({ $in: ['Red', 'Blue'] })
  })
})
