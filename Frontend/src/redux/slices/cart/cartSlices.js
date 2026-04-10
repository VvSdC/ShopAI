import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../../../utils/axiosInstance'

//initalsState
const initialState = {
  cartItems: [],
  loading: false,
  error: null,
  isAdded: false,
  isUpdated: false,
  isDelete: false,
  stockWarnings: [], // [{_id, color, size, reason}]
  validating: false,
}

//add product to cart
export const addOrderToCartaction = createAsyncThunk(
  'cart/add-to-cart',
  async (cartItem) => {
    const cartItems = localStorage.getItem('cartItems')
      ? JSON.parse(localStorage.getItem('cartItems'))
      : []
    //check if same product with same color and size already exists
    const existingIndex = cartItems.findIndex(
      (item) =>
        item?._id?.toString() === cartItem?._id?.toString() &&
        item?.color === cartItem?.color &&
        item?.size === cartItem?.size
    )
    if (existingIndex >= 0) {
      //merge quantities
      cartItems[existingIndex].qty += cartItem.qty
      cartItems[existingIndex].totalPrice =
        cartItems[existingIndex].qty * cartItems[existingIndex].price
    } else {
      cartItems.push(cartItem)
    }
    localStorage.setItem('cartItems', JSON.stringify(cartItems))
    return cartItems
  }
)
//add product to cart
export const getCartItemsFromLocalStorageAction = createAsyncThunk(
  'cart/get-order-items',
  async () => {
    const cartItems = localStorage.getItem('cartItems')
      ? JSON.parse(localStorage.getItem('cartItems'))
      : []

    return cartItems
  }
)

//change cart item qty
export const changeOrderItemQty = createAsyncThunk(
  'cart/change-item-qty',
  async ({ productId, color, size, qty }) => {
    const cartItems = localStorage.getItem('cartItems')
      ? JSON.parse(localStorage.getItem('cartItems'))
      : []
    const newCartItems = cartItems?.map((item) => {
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
    localStorage.setItem('cartItems', JSON.stringify(newCartItems))
    return newCartItems
  }
)

//remove from cart
export const removeOrderItemQty = createAsyncThunk(
  'cart/removeOrderItem',
  async ({ productId, color, size }) => {
    const cartItems = localStorage.getItem('cartItems')
      ? JSON.parse(localStorage.getItem('cartItems'))
      : []
    const newItems = cartItems?.filter(
      (item) =>
        !(
          item?._id === productId &&
          item?.color === color &&
          item?.size === size
        )
    )
    localStorage.setItem('cartItems', JSON.stringify(newItems))
    return newItems
  }
)

//validate cart items against current stock
export const validateCartAction = createAsyncThunk(
  'cart/validate',
  async (_, { rejectWithValue }) => {
    try {
      const cartItems = localStorage.getItem('cartItems')
        ? JSON.parse(localStorage.getItem('cartItems'))
        : []
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
          // keep in cart but mark unavailable
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

      localStorage.setItem('cartItems', JSON.stringify(updatedCart))
      return { items: updatedCart, warnings }
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//slice
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  extraReducers: (builder) => {
    //add to cart
    builder.addCase(addOrderToCartaction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(addOrderToCartaction.fulfilled, (state, action) => {
      state.loading = false
      state.cartItems = action.payload
      state.isAdded = true
    })
    builder.addCase(addOrderToCartaction.rejected, (state, action) => {
      state.loading = false
      state.cartItems = null
      state.isAdded = false
      state.error = action.payload
    })
    //fetch cart items
    builder.addCase(getCartItemsFromLocalStorageAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(
      getCartItemsFromLocalStorageAction.fulfilled,
      (state, action) => {
        state.loading = false
        state.cartItems = action.payload
      }
    )
    builder.addCase(
      getCartItemsFromLocalStorageAction.rejected,
      (state, action) => {
        state.loading = false
        state.cartItems = null
        state.isAdded = false
        state.error = action.payload
      }
    )
    //validate cart
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

//generate the reducer
const cartReducer = cartSlice.reducer

export default cartReducer
