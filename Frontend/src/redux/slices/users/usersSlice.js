import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axiosInstance from '../../../utils/axiosInstance'

import baseURL from '../../../utils/baseURL'
import {
  resetErrAction,
  resetSuccessAction,
} from '../globalActions/globalActions'
//initialState
const initialState = {
  loading: false,
  error: null,
  users: [],
  user: null,
  profile: {},
  userAuth: {
    loading: false,
    error: null,
    isLoggedIn: false,
    userInfo: null,
  },
}

//register action
export const registerUserAction = createAsyncThunk(
  'users/register',
  async (
    { email, password, fullname },
    { rejectWithValue, getState, dispatch }
  ) => {
    try {
      //make the http request
      const { data } = await axiosInstance.post(`/users/register`, {
        email,
        password,
        fullname,
      })
      return data
    } catch (error) {
      console.log(error)
      return rejectWithValue(error?.response?.data)
    }
  }
)

//update user shipping address action
export const updateUserShippingAddressAction = createAsyncThunk(
  'users/update-shipping-address',
  async (
    {
      firstName,
      lastName,
      address,
      city,
      postalCode,
      province,
      phone,
      country,
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axiosInstance.put(
        `/users/update/shipping`,
        {
          firstName,
          lastName,
          address,
          city,
          postalCode,
          province,
          phone,
          country,
        }
      )
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//edit shipping address action
export const editShippingAddressAction = createAsyncThunk(
  'users/edit-shipping-address',
  async (
    { addressId, firstName, lastName, address, city, postalCode, province, phone, country },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axiosInstance.put(
        `/users/update/shipping/${addressId}`,
        { firstName, lastName, address, city, postalCode, province, phone, country }
      )
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//delete shipping address action
export const deleteShippingAddressAction = createAsyncThunk(
  'users/delete-shipping-address',
  async (addressId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.delete(
        `/users/update/shipping/${addressId}`
      )
      return data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//user profile action
export const getUserProfileAction = createAsyncThunk(
  'users/profile-fetched',
  async (payload, { rejectWithValue, getState, dispatch }) => {
    try {
      const { data } = await axiosInstance.get(`/users/profile`)
      return data
    } catch (error) {
      console.log(error)
      return rejectWithValue(error?.response?.data)
    }
  }
)

//login action
export const loginUserAction = createAsyncThunk(
  'users/login',
  async ({ email, password }, { rejectWithValue, getState, dispatch }) => {
    try {
      //make the http request (cookies set automatically by backend)
      const { data } = await axiosInstance.post(`/users/login`, {
        email,
        password,
      })
      return data
    } catch (error) {
      console.log(error)
      return rejectWithValue(error?.response?.data)
    }
  }
)

//get current user from JWT cookie
export const getCurrentUserAction = createAsyncThunk(
  'users/get-current-user',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/users/me`)
      // Normalize backend response shapes: some endpoints return { user },
      // others return { data: user } or the user directly.
      return data?.user || data?.data || data
    } catch (error) {
      return rejectWithValue(error?.response?.data)
    }
  }
)

//logout action
export const logoutAction = createAsyncThunk(
  'users/logout',
  async (payload, { rejectWithValue, getState, dispatch }) => {
    try {
      // Call backend to clear httpOnly cookies
      await axiosInstance.post(`/users/logout`)
    } catch (error) {
      // Continue with local cleanup even if backend call fails
    }
    localStorage.removeItem('cartItems')
    return true
  }
)

//users slice

const usersSlice = createSlice({
  name: 'users',
  initialState,
  extraReducers: (builder) => {
    //handle actions
    //login
    builder.addCase(loginUserAction.pending, (state, action) => {
      state.userAuth.loading = true
    })
    builder.addCase(loginUserAction.fulfilled, (state, action) => {
      state.userAuth.isLoggedIn = true
      state.userAuth.loading = false
    })
    builder.addCase(loginUserAction.rejected, (state, action) => {
      state.userAuth.error = action.payload
      state.userAuth.loading = false
    })
    //get current user
    builder.addCase(getCurrentUserAction.pending, (state, action) => {
      state.userAuth.loading = true
    })
    builder.addCase(getCurrentUserAction.fulfilled, (state, action) => {
      // action.payload may be the user object or an object containing { user }
      state.userAuth.userInfo = action.payload?.user || action.payload
      state.userAuth.isLoggedIn = true
      state.userAuth.loading = false
    })
    builder.addCase(getCurrentUserAction.rejected, (state, action) => {
      state.userAuth.userInfo = null
      state.userAuth.isLoggedIn = false
      state.userAuth.loading = false
    })
    //register
    builder.addCase(registerUserAction.pending, (state, action) => {
      state.loading = true
    })
    builder.addCase(registerUserAction.fulfilled, (state, action) => {
      state.user = action.payload
      state.loading = false
    })
    builder.addCase(registerUserAction.rejected, (state, action) => {
      state.error = action.payload
      state.loading = false
    })
    //logout
    builder.addCase(logoutAction.fulfilled, (state, action) => {
      state.userAuth.userInfo = null
      state.userAuth.isLoggedIn = false
    })
    //profile
    builder.addCase(getUserProfileAction.pending, (state, action) => {
      state.loading = true
    })
    builder.addCase(getUserProfileAction.fulfilled, (state, action) => {
      state.profile = action.payload
      state.loading = false
    })
    builder.addCase(getUserProfileAction.rejected, (state, action) => {
      state.error = action.payload
      state.loading = false
    })
    //shipping address
    builder.addCase(
      updateUserShippingAddressAction.pending,
      (state, action) => {
        state.loading = true
      }
    )
    builder.addCase(
      updateUserShippingAddressAction.fulfilled,
      (state, action) => {
        state.profile = { ...state.profile, user: action.payload?.user }
        state.loading = false
      }
    )
    builder.addCase(
      updateUserShippingAddressAction.rejected,
      (state, action) => {
        state.error = action.payload
        state.loading = false
      }
    )
    //edit shipping address
    builder.addCase(editShippingAddressAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(editShippingAddressAction.fulfilled, (state, action) => {
      state.profile = { ...state.profile, user: action.payload?.user }
      state.loading = false
    })
    builder.addCase(editShippingAddressAction.rejected, (state, action) => {
      state.error = action.payload
      state.loading = false
    })
    //delete shipping address
    builder.addCase(deleteShippingAddressAction.pending, (state) => {
      state.loading = true
    })
    builder.addCase(deleteShippingAddressAction.fulfilled, (state, action) => {
      state.profile = { ...state.profile, user: action.payload?.user }
      state.loading = false
    })
    builder.addCase(deleteShippingAddressAction.rejected, (state, action) => {
      state.error = action.payload
      state.loading = false
    })
    //reset error action
    builder.addCase(resetErrAction.pending, (state) => {
      state.error = null
      state.userAuth.error = null
    })
  },
})

//generate reducer
const usersReducer = usersSlice.reducer

export default usersReducer
