import axiosInstance from '../../../utils/axiosInstance'
import {
  resetErrAction,
  resetSuccessAction,
} from '../globalActions/globalActions'
const { createAsyncThunk, createSlice } = require('@reduxjs/toolkit')

//initalsState
const initialState = {
  products: [],
  product: {},
  loading: false,
  error: null,
  isAdded: false,
  isUpdated: false,
  isDelete: false,
}

//create product action
export const createProductAction = createAsyncThunk(
  'product/create',
  async (payload, { rejectWithValue, getState, dispatch }) => {
    console.log(payload)
    try {
      const {
        name,
        description,
        category,
        sizes,
        brand,
        colors,
        price,
        totalQty,
        files,
      } = payload
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
      //FormData
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('category', category)

      formData.append('brand', brand)
      formData.append('price', price)
      formData.append('totalQty', totalQty)

      sizes.forEach((size) => {
        formData.append('sizes', size)
      })
      colors.forEach((color) => {
        formData.append('colors', color)
      })

      files.forEach((file) => {
        formData.append('files', file)
      })

      const { data } = await axiosInstance.post(`/products`, formData, config)
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//create product action
export const updateProductAction = createAsyncThunk(
  'product/update',
  async (payload, { rejectWithValue, getState, dispatch }) => {
    console.log(payload)
    try {
      const {
        name,
        description,
        category,
        sizes,
        brand,
        colors,
        price,
        totalQty,
        id,
      } = payload

      const { data } = await axiosInstance.put(
        `/products/${id}`,
        {
          name,
          description,
          category,
          sizes,
          brand,
          colors,
          price,
          totalQty,
        }
      )
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//delete product action
export const deleteProductAction = createAsyncThunk(
  'product/delete',
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.delete(`/products/${productId}/delete`)
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//fetch products action
export const fetchProductsAction = createAsyncThunk(
  'product/list',
  async ({ url }, { rejectWithValue, getState, dispatch }) => {
    console.log(url)
    try {
      const { data } = await axiosInstance.get(`${url}`, {
        baseURL: '', // Override baseURL since url is already full
      })
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//fetch product action
export const fetchProductAction = createAsyncThunk(
  'product/details',
  async (productId, { rejectWithValue, getState, dispatch }) => {
    try {
      const { data } = await axiosInstance.get(
        `/products/${productId}`
      )
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)
//slice
const productSlice = createSlice({
  name: 'products',
  initialState,
  extraReducers: (builder) => {
    //create
    builder.addCase(createProductAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(createProductAction.fulfilled, (state, action) => {
      state.loading = false
      state.product = action.payload
      state.isAdded = true
    })
    builder.addCase(createProductAction.rejected, (state, action) => {
      state.loading = false
      state.product = null
      state.isAdded = false
      state.error = action.payload
    })
    //update
    builder.addCase(updateProductAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(updateProductAction.fulfilled, (state, action) => {
      state.loading = false
      state.product = action.payload
      state.isUpdated = true
    })
    builder.addCase(updateProductAction.rejected, (state, action) => {
      state.loading = false
      state.product = null
      state.isUpdated = false
      state.error = action.payload
    })
    //delete
    builder.addCase(deleteProductAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(deleteProductAction.fulfilled, (state, action) => {
      state.loading = false
      state.isDelete = true
    })
    builder.addCase(deleteProductAction.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload
    })
    //fetch all
    builder.addCase(fetchProductsAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(fetchProductsAction.fulfilled, (state, action) => {
      state.loading = false
      state.products = action.payload
    })
    builder.addCase(fetchProductsAction.rejected, (state, action) => {
      state.loading = false
      state.products = null
      state.isAdded = false
      state.error = action.payload
    })
    //fetch single product
    builder.addCase(fetchProductAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(fetchProductAction.fulfilled, (state, action) => {
      state.loading = false
      state.product = action.payload.product
    })
    builder.addCase(fetchProductAction.rejected, (state, action) => {
      state.loading = false
      state.product = null
      state.isAdded = false
      state.error = action.payload
    })
    //reset error
    builder.addCase(resetErrAction.pending, (state, action) => {
      state.error = null
    })
    //reset success
    builder.addCase(resetSuccessAction.pending, (state, action) => {
      state.isAdded = false
      state.isUpdated = false
      state.isDelete = false
    })
  },
})

//generate the reducer
const productReducer = productSlice.reducer

export default productReducer
