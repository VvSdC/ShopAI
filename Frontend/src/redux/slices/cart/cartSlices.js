import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../../../utils/axiosInstance'
import { fetchCouponAction } from '../coupons/couponsSlice'
import { parseLocalCart } from '../../../utils/localCart'
import { skipIfListFetching } from '../../utils/skipIfFetching'
import {
  isRecentPostCheckout,
  clearPostCheckoutFlag,
} from '../../../utils/postCheckout'

const initialState = {
  cartItems: [],
  loading: false,
  listFetching: false,
  error: null,
  isAdded: false,
  isUpdated: false,
  isDelete: false,
  stockWarnings: [],
  priceWarnings: [],
  mergeConflicts: [],
  validating: false,
  serverCouponCode: null,
  serverTotal: null,
}

function cartLineKey(item) {
  if (!item?._id) return ''
  return `${String(item._id)}|${item.color}|${item.size}`
}

/** Split guest local cart into lines safe to upload vs qty mismatches (server wins). */
export function partitionLocalCartForMerge(localItems, serverItems) {
  const serverByKey = new Map((serverItems || []).map((item) => [cartLineKey(item), item]))
  const itemsToSync = []
  const mergeConflicts = []

  for (const local of localItems || []) {
    if (!local?._id || !local?.color || !local?.size) continue
    const key = cartLineKey(local)
    const serverLine = serverByKey.get(key)
    if (!serverLine) {
      itemsToSync.push(local)
      continue
    }
    if (Number(serverLine.qty) !== Number(local.qty)) {
      mergeConflicts.push({
        _id: local._id,
        color: local.color,
        size: local.size,
        name: local.name || serverLine.name,
        localQty: local.qty,
        serverQty: serverLine.qty,
        reason: `This device had ${local.qty}, your account cart has ${serverLine.qty}. We kept the account quantity.`,
      })
    }
  }

  return { itemsToSync, mergeConflicts }
}

function mapServerCartItems(items) {
  return (items || []).map((item) => ({
    _id: item._id,
    name: item.name,
    qty: item.qty,
    price: item.price,
    totalPrice: item.totalPrice,
    color: item.color,
    size: item.size,
    description: item.description || '',
    image: item.image || '',
    qtyLeft: item.qtyLeft,
    unavailable: item.unavailable,
    adjusted: item.adjusted,
    reason: item.reason,
  }))
}

function mapServerCartResponse(data) {
  return {
    cartItems: mapServerCartItems(data.cart?.items),
    serverCouponCode: data.cart?.couponCode || null,
    serverTotal: data.cart?.total ?? null,
    priceWarnings: data.cart?.priceWarnings || [],
  }
}

function persistCartItems(items) {
  localStorage.setItem('cartItems', JSON.stringify(items))
}

function readLocalCart() {
  return parseLocalCart(localStorage.getItem('cartItems'))
}

function isLoggedIn(getState) {
  return Boolean(getState()?.users?.userAuth?.isLoggedIn)
}

export const getCartFromServerAction = createAsyncThunk(
  'cart/fetch-server',
  async (_, { rejectWithValue, getState }) => {
    if (!isLoggedIn(getState)) {
      return { cartItems: readLocalCart(), fromServer: false }
    }
    try {
      const { data } = await axiosInstance.get('/cart')
      const payload = mapServerCartResponse(data)
      persistCartItems(payload.cartItems)
      return {
        ...payload,
        fromServer: true,
      }
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  },
  { condition: skipIfListFetching('carts') }
)

export const clearCartAction = createAsyncThunk(
  'cart/clear',
  async (_, { rejectWithValue, getState }) => {
    persistCartItems([])
    if (!isLoggedIn(getState)) {
      return {
        cartItems: [],
        serverCouponCode: null,
        serverTotal: null,
        fromServer: false,
      }
    }
    try {
      const { data } = await axiosInstance.delete('/cart')
      const payload = mapServerCartResponse(data)
      persistCartItems(payload.cartItems)
      return { ...payload, fromServer: true }
    } catch (error) {
      persistCartItems([])
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const syncAndLoadCartAction = createAsyncThunk(
  'cart/sync-and-load',
  async (_, { rejectWithValue, getState, dispatch }) => {
    if (!isLoggedIn(getState)) {
      return { cartItems: readLocalCart(), fromServer: false }
    }
    try {
      if (isRecentPostCheckout()) {
        persistCartItems([])
        const { data } = await axiosInstance.get('/cart')
        const payload = mapServerCartResponse(data)
        persistCartItems(payload.cartItems)
        clearPostCheckoutFlag()
        return {
          ...payload,
          fromServer: true,
          mergeConflicts: [],
        }
      }

      const { data: initial } = await axiosInstance.get('/cart')
      const serverItems = mapServerCartItems(initial.cart?.items)
      const localItems = readLocalCart()
      const { itemsToSync, mergeConflicts } = partitionLocalCartForMerge(localItems, serverItems)

      if (itemsToSync.length > 0) {
        await axiosInstance.post('/cart/sync', { items: itemsToSync })
      }

      const { data } = await axiosInstance.get('/cart')
      const payload = mapServerCartResponse(data)
      persistCartItems(payload.cartItems)
      if (data.cart?.couponCode) {
        dispatch(fetchCouponAction(data.cart.couponCode))
      }
      return {
        ...payload,
        fromServer: true,
        mergeConflicts,
      }
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  },
  { condition: skipIfListFetching('carts') }
)

export const addOrderToCartaction = createAsyncThunk(
  'cart/add-to-cart',
  async (cartItem, { rejectWithValue, getState }) => {
    if (!isLoggedIn(getState)) {
      const cartItems = readLocalCart()
      const existingIndex = cartItems.findIndex(
        (item) =>
          item?._id?.toString() === cartItem?._id?.toString() &&
          item?.color === cartItem?.color &&
          item?.size === cartItem?.size
      )
      if (existingIndex >= 0) {
        cartItems[existingIndex].qty += cartItem.qty
        cartItems[existingIndex].totalPrice =
          cartItems[existingIndex].qty * cartItems[existingIndex].price
      } else {
        cartItems.push(cartItem)
      }
      persistCartItems(cartItems)
      return { cartItems }
    }

    try {
      const { data } = await axiosInstance.post('/cart/items', {
        productId: cartItem._id,
        color: cartItem.color,
        size: cartItem.size,
        qty: cartItem.qty,
      })
      const payload = mapServerCartResponse(data)
      persistCartItems(payload.cartItems)
      return payload
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const getCartItemsFromLocalStorageAction = createAsyncThunk(
  'cart/get-order-items',
  async (_, { dispatch, getState }) => {
    if (isLoggedIn(getState)) {
      return dispatch(syncAndLoadCartAction()).unwrap()
    }
    return { cartItems: readLocalCart(), fromServer: false }
  }
)

export const changeOrderItemQty = createAsyncThunk(
  'cart/change-item-qty',
  async ({ productId, color, size, qty }, { rejectWithValue, getState }) => {
    if (!isLoggedIn(getState)) {
      const cartItems = readLocalCart().map((item) => {
        if (
          item?._id?.toString() === productId?.toString() &&
          item?.color === color &&
          item?.size === size
        ) {
          const newPrice = item?.price * qty
          item.qty = +qty
          item.totalPrice = newPrice
        }
        return item
      })
      persistCartItems(cartItems)
      return { cartItems }
    }

    try {
      const { data } = await axiosInstance.patch('/cart/items', {
        productId,
        color,
        size,
        qty,
      })
      const payload = mapServerCartResponse(data)
      persistCartItems(payload.cartItems)
      return payload
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const removeOrderItemQty = createAsyncThunk(
  'cart/removeOrderItem',
  async ({ productId, color, size }, { rejectWithValue, getState }) => {
    if (!isLoggedIn(getState)) {
      const newItems = readLocalCart().filter(
        (item) =>
          !(
            item?._id?.toString() === productId?.toString() &&
            item?.color === color &&
            item?.size === size
          )
      )
      persistCartItems(newItems)
      return { cartItems: newItems }
    }

    try {
      const { data } = await axiosInstance.delete('/cart/items', {
        data: { productId, color, size },
      })
      const payload = mapServerCartResponse(data)
      persistCartItems(payload.cartItems)
      return payload
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const applyCartCouponAction = createAsyncThunk(
  'cart/apply-coupon',
  async (code, { rejectWithValue, getState, dispatch }) => {
    const trimmed = String(code || '').trim()
    if (!trimmed) return rejectWithValue({ message: 'Coupon code is required' })

    if (!isLoggedIn(getState)) {
      await dispatch(fetchCouponAction(trimmed))
      return { cartItems: readLocalCart(), fromServer: false }
    }

    try {
      const { data } = await axiosInstance.post('/cart/coupon', { code: trimmed })
      await dispatch(fetchCouponAction(trimmed))
      const payload = mapServerCartResponse(data)
      persistCartItems(payload.cartItems)
      return payload
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const validateCartAction = createAsyncThunk(
  'cart/validate',
  async (_, { rejectWithValue, getState }) => {
    try {
      if (isLoggedIn(getState)) {
        const { data } = await axiosInstance.post('/cart/validate')
        const cartItems = mapServerCartItems(data.items)
        persistCartItems(cartItems)
        return { items: cartItems, warnings: data.warnings || [] }
      }

      const cartItems = readLocalCart()
      if (cartItems.length === 0) {
        return { items: [], warnings: [] }
      }
      const { data } = await axiosInstance.post('/products/validate-cart', {
        items: cartItems,
      })
      const validated = data.items
      const warnings = []
      const updatedCart = []

      for (const item of validated) {
        if (item.unavailable) {
          warnings.push({
            _id: item._id,
            color: item.color,
            size: item.size,
            name: item.name,
            reason: item.reason,
          })
          updatedCart.push({ ...item })
        } else {
          if (item.adjusted) {
            warnings.push({
              _id: item._id,
              color: item.color,
              size: item.size,
              name: item.name,
              reason: item.reason,
            })
          }
          updatedCart.push({ ...item })
        }
      }

      persistCartItems(updatedCart)
      return { items: updatedCart, warnings }
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

function handleCartFulfilled(state, action) {
  state.loading = false
  if (action.payload?.cartItems) {
    state.cartItems = action.payload.cartItems
  }
  if (action.payload?.serverCouponCode !== undefined) {
    state.serverCouponCode = action.payload.serverCouponCode
  }
  if (action.payload?.serverTotal !== undefined) {
    state.serverTotal = action.payload.serverTotal
  }
  if (action.payload?.mergeConflicts !== undefined) {
    state.mergeConflicts = action.payload.mergeConflicts
  }
  if (action.payload?.priceWarnings !== undefined) {
    state.priceWarnings = action.payload.priceWarnings
  }
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearMergeConflicts(state) {
      state.mergeConflicts = []
    },
  },
  extraReducers: (builder) => {
    builder.addCase(addOrderToCartaction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(addOrderToCartaction.fulfilled, (state, action) => {
      handleCartFulfilled(state, action)
      state.isAdded = true
    })
    builder.addCase(addOrderToCartaction.rejected, (state, action) => {
      state.loading = false
      state.isAdded = false
      state.error = action.payload
    })

    builder.addCase(getCartItemsFromLocalStorageAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(getCartItemsFromLocalStorageAction.fulfilled, (state, action) => {
      handleCartFulfilled(state, action)
    })
    builder.addCase(getCartItemsFromLocalStorageAction.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload
    })

    builder.addCase(getCartFromServerAction.pending, (state) => {
      state.listFetching = true
    })
    builder.addCase(getCartFromServerAction.fulfilled, (state, action) => {
      state.listFetching = false
      handleCartFulfilled(state, action)
    })
    builder.addCase(getCartFromServerAction.rejected, (state, action) => {
      state.listFetching = false
      state.error = action.payload
    })

    builder.addCase(clearCartAction.fulfilled, (state, action) => {
      state.listFetching = false
      state.cartItems = action.payload?.cartItems || []
      state.serverCouponCode = action.payload?.serverCouponCode ?? null
      state.serverTotal = action.payload?.serverTotal ?? null
      state.priceWarnings = []
      state.mergeConflicts = []
    })
    builder.addCase(clearCartAction.rejected, (state) => {
      state.listFetching = false
      state.cartItems = []
      state.serverCouponCode = null
      state.serverTotal = null
      state.priceWarnings = []
      state.mergeConflicts = []
    })

    builder.addCase(syncAndLoadCartAction.pending, (state) => {
      state.listFetching = true
    })
    builder.addCase(syncAndLoadCartAction.fulfilled, (state, action) => {
      state.listFetching = false
      handleCartFulfilled(state, action)
    })
    builder.addCase(syncAndLoadCartAction.rejected, (state, action) => {
      state.listFetching = false
      state.error = action.payload
    })

    builder.addCase(changeOrderItemQty.fulfilled, (state, action) => {
      handleCartFulfilled(state, action)
      state.isUpdated = true
    })

    builder.addCase(removeOrderItemQty.fulfilled, (state, action) => {
      handleCartFulfilled(state, action)
      state.isDelete = true
    })

    builder.addCase(validateCartAction.pending, (state) => {
      state.validating = true
    })
    builder.addCase(validateCartAction.fulfilled, (state, action) => {
      state.validating = false
      state.cartItems = action.payload.items
      state.stockWarnings = action.payload.warnings
    })
    builder.addCase(validateCartAction.rejected, (state, action) => {
      state.validating = false
      state.error = action.payload
    })
  },
})

const cartReducer = cartSlice.reducer

export const { clearMergeConflicts } = cartSlice.actions

export default cartReducer
