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
    //reset error action
    builder.addCase(resetErrAction.pending, (state, action) => {
      state.isAdded = false
      state.error = null
    })
    //reset success action
    builder.addCase(resetSuccessAction.pending, (state, action) => {
      state.isAdded = false
      state.error = null
    })
  },
})

//generate the reducer
const brandsReducer = brandsSlice.reducer

export default brandsReducer
