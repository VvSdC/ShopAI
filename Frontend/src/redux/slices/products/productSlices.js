import axiosInstance from '../../../utils/axiosInstance'
import {
  resetErrAction,
  resetSuccessAction,
} from '../globalActions/globalActions'
import { skipIfSameFetchInFlight } from '../../utils/skipIfFetching'
const { createAsyncThunk, createSlice } = require('@reduxjs/toolkit')

//initalsState
const initialState = {
  products: [],
  product: {},
  loading: false,
  listFetching: false,
  listFetchKey: null,
  detailFetching: false,
  detailFetchKey: null,
  similarByProductId: {},
  similarFetching: false,
  similarFetchKey: null,
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
        sizeMeasurementType,
        sizeLabel,
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
      formData.append('sizeMeasurementType', sizeMeasurementType || 'apparel')
      if (sizeLabel) {
        formData.append('sizeLabel', sizeLabel)
      }

      ;(sizes || []).forEach((size) => {
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
        sizeMeasurementType,
        sizeLabel,
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
          sizeMeasurementType,
          sizeLabel,
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
  },
  {
    condition: skipIfSameFetchInFlight('products', {}, (arg) => arg?.url ?? ''),
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
  },
  {
    condition: skipIfSameFetchInFlight(
      'products',
      { fetchingKey: 'detailFetching', requestKey: 'detailFetchKey' },
      (productId) => String(productId ?? '')
    ),
  }
)

export const fetchSimilarProductsAction = createAsyncThunk(
  'product/similar',
  async ({ productId, limit = 8 }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/products/${productId}/similar`, {
        params: { limit },
      })
      return {
        productId: String(productId),
        products: Array.isArray(data?.products) ? data.products : [],
        mode: data?.mode ?? null,
      }
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  },
  {
    condition: (arg, { getState }) => {
      const id = String(arg?.productId ?? '')
      if (!id) return false

      const slice = getState()?.products
      if (slice?.similarByProductId?.[id]) return false

      if (slice?.similarFetching && slice?.similarFetchKey === id) return false

      return true
    },
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
      state.isAdded = false
      state.error = null
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
    builder.addCase(fetchProductsAction.pending, (state, action) => {
      state.loading = true
      state.listFetching = true
      state.listFetchKey = action.meta.arg?.url ?? null
    })
    builder.addCase(fetchProductsAction.fulfilled, (state, action) => {
      state.loading = false
      state.listFetching = false
      state.listFetchKey = null
      state.products = action.payload
    })
    builder.addCase(fetchProductsAction.rejected, (state, action) => {
      state.loading = false
      state.listFetching = false
      state.listFetchKey = null
      state.products = null
      state.isAdded = false
      state.error = action.payload
    })
    //fetch single product
    builder.addCase(fetchProductAction.pending, (state, action) => {
      state.loading = true
      state.detailFetching = true
      state.detailFetchKey = String(action.meta.arg ?? '')
      state.isUpdated = false
    })
    builder.addCase(fetchProductAction.fulfilled, (state, action) => {
      state.loading = false
      state.detailFetching = false
      state.detailFetchKey = null
      state.product = action.payload.product
    })
    builder.addCase(fetchProductAction.rejected, (state, action) => {
      state.loading = false
      state.detailFetching = false
      state.detailFetchKey = null
      state.product = null
      state.isAdded = false
      state.error = action.payload
    })
    // similar products (cached per product id)
    builder.addCase(fetchSimilarProductsAction.pending, (state, action) => {
      state.similarFetching = true
      state.similarFetchKey = String(action.meta.arg?.productId ?? '')
    })
    builder.addCase(fetchSimilarProductsAction.fulfilled, (state, action) => {
      state.similarFetching = false
      state.similarFetchKey = null
      const { productId, products, mode } = action.payload
      state.similarByProductId[productId] = { products, mode }
    })
    builder.addCase(fetchSimilarProductsAction.rejected, (state, action) => {
      const productId = String(action.meta.arg?.productId ?? '')
      state.similarFetching = false
      state.similarFetchKey = null
      if (productId) {
        state.similarByProductId[productId] = { products: [], mode: null }
      }
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
