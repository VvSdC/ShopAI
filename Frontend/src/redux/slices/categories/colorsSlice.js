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
  async ({ name, hex }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(`/colors`, { name, hex })
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//fetch colors action
export const fetchColorsAction = createAsyncThunk(
  'colors/fetch-all',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/colors`)
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//update color action
export const updateColorAction = createAsyncThunk(
  'color/update',
  async ({ id, name, hex }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(`/colors/${id}`, { name, hex })
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//delete color action
export const deleteColorAction = createAsyncThunk(
  'color/delete',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.delete(`/colors/${id}`)
      return { ...data, _id: id }
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//slice
const colorsSlice = createSlice({
  name: 'colors',
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
      state.error = action.payload
    })

    //update
    builder.addCase(updateColorAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(updateColorAction.fulfilled, (state, action) => {
      state.loading = false
      state.color = action.payload
      state.isUpdated = true
    })
    builder.addCase(updateColorAction.rejected, (state, action) => {
      state.loading = false
      state.isUpdated = false
      state.error = action.payload
    })

    //delete
    builder.addCase(deleteColorAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(deleteColorAction.fulfilled, (state, action) => {
      state.loading = false
      state.isDelete = true
    })
    builder.addCase(deleteColorAction.rejected, (state, action) => {
      state.loading = false
      state.isDelete = false
      state.error = action.payload
    })

    //reset error action
    builder.addCase(resetErrAction.pending, (state) => {
      state.isAdded = false
      state.isUpdated = false
      state.isDelete = false
      state.error = null
    })
    //reset success action
    builder.addCase(resetSuccessAction.pending, (state) => {
      state.isAdded = false
      state.isUpdated = false
      state.isDelete = false
      state.error = null
    })
  },
})

//generate the reducer
const colorsReducer = colorsSlice.reducer

export default colorsReducer
