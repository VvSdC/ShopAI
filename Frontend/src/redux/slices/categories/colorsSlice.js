import axiosInstance from '../../../utils/axiosInstance'
import {
  resetErrAction,
  resetSuccessAction,
} from '../globalActions/globalActions'
const { createAsyncThunk, createSlice } = require('@reduxjs/toolkit')

//initalsState
const initialState = {
  colors: [],
  color: {},
  loading: false,
  error: null,
  isAdded: false,
  isUpdated: false,
  isDelete: false,
}

//create color action
export const createColorAction = createAsyncThunk(
  'color/create',
  async ({ name, hex }, { rejectWithValue, getState, dispatch }) => {
    try {
      //Token - Authenticated
      //Images
      const { data } = await axiosInstance.post(
        `/colors`,
        {
          name,
          hex,
        }
      )
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//fetch colors action
export const fetchColorsAction = createAsyncThunk(
  'colors/fetch-all',
  async (payload, { rejectWithValue, getState, dispatch }) => {
    try {
      const { data } = await axiosInstance.get(`/colors`)
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)
//slice
const colorsSlice = createSlice({
  name: 'brands',
  initialState,
  extraReducers: (builder) => {
    //create
    builder.addCase(createColorAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(createColorAction.fulfilled, (state, action) => {
      state.loading = false
      state.color = action.payload
      state.isAdded = true
      setTimeout(function () {
        window.location.reload()
      }, 3000)
    })
    builder.addCase(createColorAction.rejected, (state, action) => {
      state.loading = false
      state.color = null
      state.isAdded = false
      state.error = action.payload
    })

    //fetch all
    builder.addCase(fetchColorsAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(fetchColorsAction.fulfilled, (state, action) => {
      state.loading = false
      state.colors = action.payload
    })
    builder.addCase(fetchColorsAction.rejected, (state, action) => {
      state.loading = false
      state.colors = null
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
const colorsReducer = colorsSlice.reducer

export default colorsReducer
