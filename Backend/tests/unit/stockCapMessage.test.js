import { describe, it, expect } from 'vitest'
import {
  collectStockAdjustments,
  formatStockAdjustmentNote,
} from '../../services/chatCartAssist.js'

describe('collectStockAdjustments', () => {
  it('returns nothing when no adjustments happened', () => {
    const results = [
      { toolName: 'add_to_cart', success: true, cart: { items: [] } },
      { toolName: 'get_cart', cart: { items: [] } },
    ]
    expect(collectStockAdjustments(results)).toEqual([])
  })

  it('ignores adjustments with adjusted:false', () => {
    const results = [
      {
        toolName: 'add_to_cart',
        success: true,
        cart: { items: [] },
        stockAdjustment: {
          productId: 'p1',
          productName: 'Bat',
          requestedQty: 2,
          finalQty: 2,
          qtyLeft: 40,
          adjusted: false,
        },
      },
    ]
    expect(collectStockAdjustments(results)).toEqual([])
  })

  it('collects adjustments when qty was capped', () => {
    const adj = {
      productId: 'p1',
      productName: 'Kookaburra Bat',
      requestedQty: 41,
      finalQty: 40,
      qtyLeft: 40,
      adjusted: true,
    }
    const results = [
      { toolName: 'add_to_cart', success: true, cart: { items: [] }, stockAdjustment: adj },
    ]
    expect(collectStockAdjustments(results)).toEqual([adj])
  })

  it('deduplicates repeated adjustments for the same product/quantities', () => {
    const adj = {
      productId: 'p1',
      productName: 'Kookaburra Bat',
      requestedQty: 5,
      finalQty: 3,
      qtyLeft: 3,
      adjusted: true,
    }
    const results = [
      { toolName: 'add_to_cart', stockAdjustment: adj },
      { toolName: 'add_to_cart', stockAdjustment: adj },
    ]
    expect(collectStockAdjustments(results)).toHaveLength(1)
  })
})

describe('formatStockAdjustmentNote', () => {
  it('produces a human-readable "only N in stock" note', () => {
    const note = formatStockAdjustmentNote({
      productId: 'p1',
      productName: 'Kookaburra Bat',
      requestedQty: 41,
      finalQty: 40,
      qtyLeft: 40,
      adjusted: true,
    })
    expect(note).toMatch(/only\s+\*\*40\*\*/i)
    expect(note).toMatch(/Kookaburra Bat/)
    expect(note).toMatch(/added\s+\*\*40\*\*/i)
    expect(note).toMatch(/instead of 41/i)
  })

  it('falls back to "that item" when product name is missing', () => {
    const note = formatStockAdjustmentNote({
      requestedQty: 5,
      finalQty: 3,
      qtyLeft: 3,
      adjusted: true,
    })
    expect(note).toMatch(/that item/)
  })
})
