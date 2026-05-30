import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../../../utils/axiosInstance'
import { fetchCouponAction } from '../coupons/couponsSlice'

const initialState = {
  cartItems: [],
  loading: false,
  error: null,
  isAdded: false,
  isUpdated: false,
  isDelete: false,
  stockWarnings: [],
  validating: false,
  serverCouponCode: null,
  serverTotal: null,
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
  }))
}

function persistCartItems(items) {
  localStorage.setItem('cartItems', JSON.stringify(items))
}

function readLocalCart() {
  return localStorage.getItem('cartItems')
    ? JSON.parse(localStorage.getItem('cartItems'))
    : []
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
      const cartItems = mapServerCartItems(data.cart?.items)
      persistCartItems(cartItems)
      return {
        cartItems,
        fromServer: true,
        serverCouponCode: data.cart?.couponCode || null,
        serverTotal: data.cart?.total ?? null,
      }
    } catch (error) {
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
      const localItems = readLocalCart()
      if (localItems.length > 0) {
        await axiosInstance.post('/cart/sync', { items: localItems })
      }
      const { data } = await axiosInstance.get('/cart')
      const cartItems = mapServerCartItems(data.cart?.items)
      persistCartItems(cartItems)
      if (data.cart?.couponCode) {
        dispatch(fetchCouponAction(data.cart.couponCode))
      }
      return {
        cartItems,
        fromServer: true,
        serverCouponCode: data.cart?.couponCode || null,
        serverTotal: data.cart?.total ?? null,
      }
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
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
      const cartItems = mapServerCartItems(data.cart?.items)
      persistCartItems(cartItems)
      return {
        cartItems,
        serverCouponCode: data.cart?.couponCode || null,
        serverTotal: data.cart?.total ?? null,
      }
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
      const cartItems = mapServerCartItems(data.cart?.items)
      persistCartItems(cartItems)
      return {
        cartItems,
        serverCouponCode: data.cart?.couponCode || null,
        serverTotal: data.cart?.total ?? null,
      }
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
      const cartItems = mapServerCartItems(data.cart?.items)
      persistCartItems(cartItems)
      return {
        cartItems,
        serverCouponCode: data.cart?.couponCode || null,
        serverTotal: data.cart?.total ?? null,
      }
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
      const cartItems = mapServerCartItems(data.cart?.items)
      persistCartItems(cartItems)
      return {
        cartItems,
        serverCouponCode: data.cart?.couponCode || null,
        serverTotal: data.cart?.total ?? null,
      }
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
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
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

    builder.addCase(getCartFromServerAction.fulfilled, (state, action) => {
      handleCartFulfilled(state, action)
    })
    builder.addCase(syncAndLoadCartAction.fulfilled, (state, action) => {
      handleCartFulfilled(state, action)
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

export default cartReducer
