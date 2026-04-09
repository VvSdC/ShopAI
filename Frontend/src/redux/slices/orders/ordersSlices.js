import axiosInstance from '../../../utils/axiosInstance'
import {
  resetErrAction,
  resetSuccessAction,
} from '../globalActions/globalActions'
const { createAsyncThunk, createSlice } = require('@reduxjs/toolkit')

//initalsState
const initialState = {
  orders: [],
  order: null,
  loading: false,
  error: null,
  isAdded: false,
  isUpdated: false,
  stats: null,
  userOrders: [],
  pagination: null,
}

//create product action
export const placeOrderAction = createAsyncThunk(
  'order/place-order',
  async (payload, { rejectWithValue, getState, dispatch }) => {
    try {
      const { orderItems, shippingAddress, totalPrice } = payload
      //request
      const { data } = await axiosInstance.post(
        `/orders`,
        {
          orderItems,
          shippingAddress,
          totalPrice,
        }
      )
      return window.open(data?.url)
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//fetch current user's orders (paginated)
export const fetchUserOrdersAction = createAsyncThunk(
  'orders/user-orders',
  async ({ page = 1, limit = 5 } = {}, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        `/orders/my-orders?page=${page}&limit=${limit}`
      )
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//fetch products action
export const fetchOrdersAction = createAsyncThunk(
  'orders/list',
  async (payload, { rejectWithValue, getState, dispatch }) => {
    try {
      const { data } = await axiosInstance.get(`/orders`)
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//Get orders stats
export const OrdersStatsAction = createAsyncThunk(
  'orders/statistics',
  async (payload, { rejectWithValue, getState, dispatch }) => {
    try {
      const { data } = await axiosInstance.get(`/orders/sales/stats`)
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//fetch product action
export const fetchOderAction = createAsyncThunk(
  'orders/details',
  async (productId, { rejectWithValue, getState, dispatch }) => {
    try {
      const { data } = await axiosInstance.get(`/orders/${productId}`)
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//Update order
export const updateOrderAction = createAsyncThunk(
  'order/update-order',
  async (payload, { rejectWithValue, getState, dispatch }) => {
    try {
      const { status, id } = payload
      //request
      const { data } = await axiosInstance.put(
        `/orders/update/${id}`,
        {
          status,
        }
      )
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//Cancel order action
export const cancelOrderAction = createAsyncThunk(
  'orders/cancel',
  async (orderId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(`/orders/cancel/${orderId}`)
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)
//slice
const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  extraReducers: (builder) => {
    //create
    builder.addCase(placeOrderAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(placeOrderAction.fulfilled, (state, action) => {
      state.loading = false
      state.order = action.payload
      state.isAdded = true
    })
    builder.addCase(placeOrderAction.rejected, (state, action) => {
      state.loading = false
      state.order = null
      state.isAdded = false
      state.error = action.payload
    })
    //fetch all
    builder.addCase(fetchOrdersAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(fetchOrdersAction.fulfilled, (state, action) => {
      state.loading = false
      state.orders = action.payload
    })
    builder.addCase(fetchOrdersAction.rejected, (state, action) => {
      state.loading = false
      state.orders = null
      state.error = action.payload
    })
    //fetch user orders (paginated)
    builder.addCase(fetchUserOrdersAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(fetchUserOrdersAction.fulfilled, (state, action) => {
      state.loading = false
      state.userOrders = action.payload.orders
      state.pagination = action.payload.pagination
    })
    builder.addCase(fetchUserOrdersAction.rejected, (state, action) => {
      state.loading = false
      state.userOrders = []
      state.pagination = null
      state.error = action.payload
    })
    //stats
    builder.addCase(OrdersStatsAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(OrdersStatsAction.fulfilled, (state, action) => {
      state.loading = false
      state.stats = action.payload
    })
    builder.addCase(OrdersStatsAction.rejected, (state, action) => {
      state.loading = false
      state.stats = null
      state.error = action.payload
    })
    //stats
    builder.addCase(updateOrderAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(updateOrderAction.fulfilled, (state, action) => {
      state.loading = false
      state.order = action.payload
    })
    builder.addCase(updateOrderAction.rejected, (state, action) => {
      state.loading = false
      state.order = null
      state.error = action.payload
    })
    //fetch single
    builder.addCase(fetchOderAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(fetchOderAction.fulfilled, (state, action) => {
      state.loading = false
      state.order = action.payload
    })
    builder.addCase(fetchOderAction.rejected, (state, action) => {
      state.loading = false
      state.order = null
      state.error = action.payload
    })
    //cancel order
    builder.addCase(cancelOrderAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(cancelOrderAction.fulfilled, (state, action) => {
      state.loading = false
      // Update the order in userOrders list
      const cancelled = action.payload?.order
      if (cancelled) {
        state.userOrders = state.userOrders.map((o) =>
          o._id === cancelled._id ? cancelled : o
        )
      }
    })
    builder.addCase(cancelOrderAction.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload
    })
    //reset error
    builder.addCase(resetErrAction.pending, (state, action) => {
      state.error = null
    })
    //reset success
    builder.addCase(resetSuccessAction.pending, (state, action) => {
      state.isAdded = false
    })
  },
})

//generate the reducer
const ordersReducer = ordersSlice.reducer

export default ordersReducer
