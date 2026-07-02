import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../../../utils/axiosInstance'
import { parseLocalWishlist } from '../../../utils/localWishlist'
import { skipIfListFetching } from '../../utils/skipIfFetching'

const initialState = {
  items: [],
  loading: false,
  listFetching: false,
  error: null,
}

function persistWishlistItems(items) {
  localStorage.setItem('wishlistItems', JSON.stringify(items))
}

function readLocalWishlist() {
  return parseLocalWishlist(localStorage.getItem('wishlistItems'))
}

function isLoggedIn(getState) {
  return Boolean(getState()?.users?.userAuth?.isLoggedIn)
}

function mapServerWishlistItems(items) {
  return (items || []).map((item) => ({
    _id: String(item._id),
    name: item.name || '',
    price: Number(item.price) || 0,
    image: item.image || '',
    brand: item.brand || '',
    qtyLeft: item.qtyLeft,
    inStock: item.inStock !== false,
  }))
}

function mapServerWishlistResponse(data) {
  return {
    items: mapServerWishlistItems(data.wishlist?.items),
  }
}

export function selectIsInWishlist(state, productId) {
  const key = String(productId || '')
  return (state?.wishlists?.items || []).some((item) => String(item._id) === key)
}

export const getWishlistFromLocalStorageAction = createAsyncThunk(
  'wishlist/get-local',
  async (_, { getState, dispatch }) => {
    if (isLoggedIn(getState)) {
      return dispatch(syncAndLoadWishlistAction()).unwrap()
    }
    return { items: readLocalWishlist(), fromServer: false }
  }
)

export const syncAndLoadWishlistAction = createAsyncThunk(
  'wishlist/sync-and-load',
  async (_, { rejectWithValue, getState }) => {
    if (!isLoggedIn(getState)) {
      return { items: readLocalWishlist(), fromServer: false }
    }
    try {
      const { data: initial } = await axiosInstance.get('/wishlist')
      const serverItems = mapServerWishlistItems(initial.wishlist?.items)
      const localItems = readLocalWishlist()
      const serverIds = new Set(serverItems.map((item) => String(item._id)))
      const itemsToSync = localItems.filter((item) => !serverIds.has(String(item._id)))

      if (itemsToSync.length > 0) {
        await axiosInstance.post('/wishlist/sync', { items: itemsToSync })
      }

      const { data } = await axiosInstance.get('/wishlist')
      const payload = mapServerWishlistResponse(data)
      persistWishlistItems(payload.items)
      return { ...payload, fromServer: true }
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  },
  { condition: skipIfListFetching('wishlists') }
)

export const toggleWishlistItemAction = createAsyncThunk(
  'wishlist/toggle',
  async (product, { rejectWithValue, getState }) => {
    const snapshot = {
      _id: String(product._id || product.id),
      name: product.name || '',
      price: Number(product.price) || 0,
      image: product.image || product.images?.[0] || '',
      brand: product.brand || '',
    }

    if (!isLoggedIn(getState)) {
      const items = readLocalWishlist()
      const key = snapshot._id
      const index = items.findIndex((item) => String(item._id) === key)
      if (index >= 0) {
        items.splice(index, 1)
      } else {
        items.push({ ...snapshot, inStock: true })
      }
      persistWishlistItems(items)
      return { items, toggledOn: index < 0 }
    }

    const inWishlist = selectIsInWishlist(getState(), snapshot._id)
    try {
      const { data } = inWishlist
        ? await axiosInstance.delete('/wishlist/items', { data: { productId: snapshot._id } })
        : await axiosInstance.post('/wishlist/items', { productId: snapshot._id })
      const payload = mapServerWishlistResponse(data)
      persistWishlistItems(payload.items)
      return { ...payload, toggledOn: !inWishlist }
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

export const removeWishlistItemAction = createAsyncThunk(
  'wishlist/remove',
  async (productId, { rejectWithValue, getState }) => {
    const key = String(productId)

    if (!isLoggedIn(getState)) {
      const items = readLocalWishlist().filter((item) => String(item._id) !== key)
      persistWishlistItems(items)
      return { items }
    }

    try {
      const { data } = await axiosInstance.delete('/wishlist/items', {
        data: { productId: key },
      })
      const payload = mapServerWishlistResponse(data)
      persistWishlistItems(payload.items)
      return payload
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(syncAndLoadWishlistAction.pending, (state) => {
        state.listFetching = true
        state.error = null
      })
      .addCase(syncAndLoadWishlistAction.fulfilled, (state, action) => {
        state.listFetching = false
        state.items = action.payload.items || []
      })
      .addCase(syncAndLoadWishlistAction.rejected, (state, action) => {
        state.listFetching = false
        state.error = action.payload
        state.items = readLocalWishlist()
      })
      .addCase(getWishlistFromLocalStorageAction.fulfilled, (state, action) => {
        state.items = action.payload.items || []
      })
      .addCase(toggleWishlistItemAction.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(toggleWishlistItemAction.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items || []
      })
      .addCase(toggleWishlistItemAction.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(removeWishlistItemAction.fulfilled, (state, action) => {
        state.items = action.payload.items || []
      })
  },
})

export default wishlistSlice.reducer
