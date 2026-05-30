import axiosInstance from '../../../utils/axiosInstance'
const { createAsyncThunk, createSlice } = require('@reduxjs/toolkit')

const initialState = {
  myReturns: [],
  adminReturns: [],
  reasons: [],
  eligibility: null,
  stats: [],
  loading: false,
  error: null,
}

export const fetchReturnReasonsAction = createAsyncThunk(
  'returns/reasons',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get('/returns/reasons')
      return data.reasons
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const fetchReturnEligibilityAction = createAsyncThunk(
  'returns/eligibility',
  async (orderId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/returns/eligibility/${orderId}`)
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const submitReturnRequestAction = createAsyncThunk(
  'returns/submit',
  async ({ orderId, items }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(`/returns/${orderId}`, { items })
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const fetchMyReturnsAction = createAsyncThunk(
  'returns/my',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get('/returns/my')
      return data.requests
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const fetchAdminReturnsAction = createAsyncThunk(
  'returns/admin-all',
  async (status, { rejectWithValue }) => {
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : ''
      const { data } = await axiosInstance.get(`/returns/admin/all${query}`)
      return data.requests
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const approveReturnAction = createAsyncThunk(
  'returns/approve',
  async ({ id, adminNote }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(`/returns/${id}/approve`, { adminNote })
      return data.request
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const rejectReturnAction = createAsyncThunk(
  'returns/reject',
  async ({ id, adminNote }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(`/returns/${id}/reject`, { adminNote })
      return data.request
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const fetchReturnStatsAction = createAsyncThunk(
  'returns/stats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get('/returns/stats')
      return data.stats
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

const returnsSlice = createSlice({
  name: 'returns',
  initialState,
  reducers: {
    clearReturnEligibility(state) {
      state.eligibility = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReturnReasonsAction.fulfilled, (state, action) => {
        state.reasons = action.payload || []
      })
      .addCase(fetchReturnEligibilityAction.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchReturnEligibilityAction.fulfilled, (state, action) => {
        state.loading = false
        state.eligibility = action.payload
      })
      .addCase(fetchReturnEligibilityAction.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
        state.eligibility = null
      })
      .addCase(submitReturnRequestAction.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(submitReturnRequestAction.fulfilled, (state) => {
        state.loading = false
        state.eligibility = null
      })
      .addCase(submitReturnRequestAction.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchMyReturnsAction.fulfilled, (state, action) => {
        state.myReturns = action.payload || []
      })
      .addCase(fetchAdminReturnsAction.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchAdminReturnsAction.fulfilled, (state, action) => {
        state.loading = false
        state.adminReturns = action.payload || []
      })
      .addCase(fetchAdminReturnsAction.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(approveReturnAction.fulfilled, (state, action) => {
        const updated = action.payload
        if (updated?._id) {
          state.adminReturns = state.adminReturns.map((r) =>
            r._id === updated._id ? updated : r
          )
        }
      })
      .addCase(rejectReturnAction.fulfilled, (state, action) => {
        const updated = action.payload
        if (updated?._id) {
          state.adminReturns = state.adminReturns.map((r) =>
            r._id === updated._id ? updated : r
          )
        }
      })
      .addCase(fetchReturnStatsAction.fulfilled, (state, action) => {
        state.stats = action.payload || []
      })
  },
})

export const { clearReturnEligibility } = returnsSlice.actions
export default returnsSlice.reducer
