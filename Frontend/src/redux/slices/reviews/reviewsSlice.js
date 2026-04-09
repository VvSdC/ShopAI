import axiosInstance from "../../../utils/axiosInstance";
import {
  resetErrAction,
  resetSuccessAction,
} from "../globalActions/globalActions";
const { createAsyncThunk, createSlice } = require("@reduxjs/toolkit");

//initalsState
const initialState = {
  reviews: [],
  review: {},
  loading: false,
  error: null,
  isAdded: false,
  isUpdated: false,
  isDelete: false,
};

//create review action
export const createReviewAction = createAsyncThunk(
  "review/create",
  async ({ rating, message, id }, { rejectWithValue, getState, dispatch }) => {
    try {
      const { data } = await axiosInstance.post(
        `/reviews/${id}`,
        {
          rating,
          message,
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data);
    }
  }
);

//update review action
export const updateReviewAction = createAsyncThunk(
  "review/update",
  async ({ id, rating, message }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(`/reviews/${id}`, {
        rating,
        message,
      });
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data);
    }
  }
);

//delete review action
export const deleteReviewAction = createAsyncThunk(
  "review/delete",
  async ({ id, productID }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.delete(
        `/reviews/${id}/product/${productID}`
      );
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data);
    }
  }
);

//slice
const reviewsSlice = createSlice({
  name: "reviews",
  initialState,
  extraReducers: (builder) => {
    //create
    builder.addCase(createReviewAction.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createReviewAction.fulfilled, (state, action) => {
      state.loading = false;
      state.review = action.payload;
      state.isAdded = true;
    });
    builder.addCase(createReviewAction.rejected, (state, action) => {
      state.loading = false;
      state.review = null;
      state.isAdded = false;
      state.error = action.payload;
    });

    //update
    builder.addCase(updateReviewAction.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateReviewAction.fulfilled, (state, action) => {
      state.loading = false;
      state.review = action.payload;
      state.isUpdated = true;
    });
    builder.addCase(updateReviewAction.rejected, (state, action) => {
      state.loading = false;
      state.isUpdated = false;
      state.error = action.payload;
    });

    //delete
    builder.addCase(deleteReviewAction.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteReviewAction.fulfilled, (state, action) => {
      state.loading = false;
      state.isDelete = true;
    });
    builder.addCase(deleteReviewAction.rejected, (state, action) => {
      state.loading = false;
      state.isDelete = false;
      state.error = action.payload;
    });

    //reset error action
    builder.addCase(resetErrAction.pending, (state, action) => {
      state.isAdded = false;
      state.error = null;
    });
    //reset success action
    builder.addCase(resetSuccessAction.pending, (state, action) => {
      state.isAdded = false;
      state.isUpdated = false;
      state.isDelete = false;
      state.error = null;
    });
  },
});

//generate the reducer
const reviewsReducer = reviewsSlice.reducer;

export default reviewsReducer;
