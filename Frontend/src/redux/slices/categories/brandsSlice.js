import axiosInstance from '../../../utils/axiosInstance'
import {
  resetErrAction,
  resetSuccessAction,
} from '../globalActions/globalActions'
const { createAsyncThunk, createSlice } = require('@reduxjs/toolkit')

//initalsState
const initialState = {
  brands: [],
  brand: {},
  loading: false,
  error: null,
  isAdded: false,
  isUpdated: false,
  isDelete: false,
}

//create brand action
export const createBrandAction = createAsyncThunk(
  'brand/create',
  async (name, { rejectWithValue, getState, dispatch }) => {
    try {
      //Token - Authenticated
      //Images
      const { data } = await axiosInstance.post(
        `/brands`,
        {
          name,
        }
      )
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//fetch brands action
export const fetchBrandsAction = createAsyncThunk(
  'brands/fetch All',
  async (payload, { rejectWithValue, getState, dispatch }) => {
    try {
      const { data } = await axiosInstance.get(`/brands`)
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//update brand action
export const updateBrandAction = createAsyncThunk(
  'brand/update',
  async ({ id, name }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(`/brands/${id}`, { name })
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//delete brand action
export const deleteBrandAction = createAsyncThunk(
  'brand/delete',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.delete(`/brands/${id}`)
      return { ...data, _id: id }
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//slice
const brandsSlice = createSlice({
  name: 'brands',
  initialState,
  extraReducers: (builder) => {
    //create
    builder.addCase(createBrandAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(createBrandAction.fulfilled, (state, action) => {
      state.loading = false
      state.brand = action.payload
      state.isAdded = true
    })
    builder.addCase(createBrandAction.rejected, (state, action) => {
      state.loading = false
      state.brand = null
      state.isAdded = false
      state.error = action.payload
    })

    //fetch all
    builder.addCase(fetchBrandsAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(fetchBrandsAction.fulfilled, (state, action) => {
      state.loading = false
      state.brands = action.payload
    })
    builder.addCase(fetchBrandsAction.rejected, (state, action) => {
      state.loading = false
      state.brands = null
      state.isAdded = false
      state.error = action.payload
    })
    //update
    builder.addCase(updateBrandAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(updateBrandAction.fulfilled, (state, action) => {
      state.loading = false
      state.brand = action.payload
      state.isUpdated = true
    })
    builder.addCase(updateBrandAction.rejected, (state, action) => {
      state.loading = false
      state.isUpdated = false
      state.error = action.payload
    })

    //delete
    builder.addCase(deleteBrandAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(deleteBrandAction.fulfilled, (state, action) => {
      state.loading = false
      state.isDelete = true
    })
    builder.addCase(deleteBrandAction.rejected, (state, action) => {
      state.loading = false
      state.isDelete = false
      state.error = action.payload
    })

    //reset error action
    builder.addCase(resetErrAction.pending, (state, action) => {
      state.isAdded = false
      state.isUpdated = false
      state.isDelete = false
      state.error = null
    })
    //reset success action
    builder.addCase(resetSuccessAction.pending, (state, action) => {
      state.isAdded = false
      state.isUpdated = false
      state.isDelete = false
      state.error = null
    })
  },
})

//generate the reducer
const brandsReducer = brandsSlice.reducer

export default brandsReducer
