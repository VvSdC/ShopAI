import axiosInstance from '../../../utils/axiosInstance'
import {
  resetErrAction,
  resetSuccessAction,
} from '../globalActions/globalActions'
import {
  skipIfFetching,
  skipIfSameFetchInFlight,
} from '../../utils/skipIfFetching'
const { createAsyncThunk, createSlice } = require('@reduxjs/toolkit')

//initalsState
const initialState = {
  orders: [],
  order: null,
  loading: false,
  adminListFetching: false,
  userOrdersFetching: false,
  userOrdersFetchKey: null,
  error: null,
  isAdded: false,
  isUpdated: false,
  stats: null,
  userOrders: [],
  pagination: null,
  userOrdersLatestRequestId: null,
}

//create product action
export const placeOrderAction = createAsyncThunk(
  'order/place-order',
  async (payload, { rejectWithValue, getState, dispatch }) => {
    try {
      const { orderItems, shippingAddress, totalPrice, couponCode } = payload
      const query = couponCode
        ? `?coupon=${encodeURIComponent(String(couponCode).toUpperCase().trim())}`
        : ''
      const { data } = await axiosInstance.post(
        `/orders${query}`,
        {
          orderItems,
          shippingAddress,
          totalPrice,
        },
        {
          headers: {
            'Idempotency-Key': payload.idempotencyKey || `checkout-${Date.now()}`,
          },
        }
      )
      return {
        url: data?.url,
        orderId: data?.orderId,
        orderNumber: data?.orderNumber,
        expiresAt: data?.expiresAt,
      }
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
  },
  {
    condition: (arg = {}, { getState }) => {
      if (arg.force) return true
      return skipIfSameFetchInFlight(
        'orders',
        {
          fetchingKey: 'userOrdersFetching',
          requestKey: 'userOrdersFetchKey',
        },
        ({ page = 1, limit = 5 } = {}) => `${page}:${limit}`
      )(arg, { getState })
    },
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
  },
  {
    condition: skipIfFetching((state) =>
      Boolean(state?.orders?.adminListFetching)
    ),
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
  reducers: {
    applyVerifiedOrderPayment: (state, action) => {
      const verified = action.payload
      const verifiedId = verified?._id != null ? String(verified._id) : ''
      if (!verifiedId) return

      const paymentStatus = verified.paymentStatus || 'paid'
      const patch = {
        paymentStatus,
        ...(verified.paymentMethod && verified.paymentMethod !== 'Not specified'
          ? { paymentMethod: verified.paymentMethod }
          : {}),
        ...(verified.status ? { status: verified.status } : {}),
        ...(verified.totalPrice != null ? { totalPrice: verified.totalPrice } : {}),
      }

      const idx = state.userOrders.findIndex((o) => String(o._id) === verifiedId)
      if (idx >= 0) {
        state.userOrders[idx] = { ...state.userOrders[idx], ...patch }
        return
      }

      if (paymentStatus === 'paid') {
        state.userOrders.unshift({
          _id: verified._id,
          orderNumber: verified.orderNumber,
          orderItems: verified.orderItems || [],
          shippingAddress: verified.shippingAddress,
          createdAt: verified.createdAt,
          status: verified.status || 'pending',
          paymentMethod: verified.paymentMethod || 'card',
          totalPrice: verified.totalPrice,
          ...patch,
        })
      }
    },
  },
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
      state.adminListFetching = true
    })
    builder.addCase(fetchOrdersAction.fulfilled, (state, action) => {
      state.loading = false
      state.adminListFetching = false
      state.orders = action.payload
    })
    builder.addCase(fetchOrdersAction.rejected, (state, action) => {
      state.loading = false
      state.adminListFetching = false
      state.orders = null
      state.error = action.payload
    })
    //fetch user orders (paginated)
    builder.addCase(fetchUserOrdersAction.pending, (state, action) => {
      state.loading = true
      state.userOrdersFetching = true
      state.userOrdersLatestRequestId = action.meta.requestId
      const { page = 1, limit = 5 } = action.meta.arg || {}
      state.userOrdersFetchKey = `${page}:${limit}`
    })
    builder.addCase(fetchUserOrdersAction.fulfilled, (state, action) => {
      if (action.meta.requestId !== state.userOrdersLatestRequestId) return
      state.loading = false
      state.userOrdersFetching = false
      state.userOrdersFetchKey = null
      state.userOrders = action.payload.orders
      state.pagination = action.payload.pagination
    })
    builder.addCase(fetchUserOrdersAction.rejected, (state, action) => {
      if (action.meta.requestId !== state.userOrdersLatestRequestId) return
      state.loading = false
      state.userOrdersFetching = false
      state.userOrdersFetchKey = null
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

export const { applyVerifiedOrderPayment } = ordersSlice.actions

export default ordersReducer
