/**
 * RTK createAsyncThunk `condition` helpers — skip duplicate in-flight requests.
 */

export function skipIfFetching(isFetching) {
  return (_, { getState }) => !isFetching(getState())
}

export function skipIfListFetching(sliceKey) {
  return skipIfFetching((state) => Boolean(state?.[sliceKey]?.listFetching))
}

export function skipIfSameFetchInFlight(
  sliceKey,
  { fetchingKey = 'listFetching', requestKey = 'listFetchKey' } = {},
  getFetchKey
) {
  return (arg, { getState }) => {
    const slice = getState()?.[sliceKey]
    if (!slice?.[fetchingKey]) return true
    const key = getFetchKey(arg)
    return slice[requestKey] !== key
  }
}

/** @deprecated use skipIfSameFetchInFlight */
export function skipIfSameListFetchInFlight(sliceKey, getFetchKey) {
  return skipIfSameFetchInFlight(sliceKey, {}, getFetchKey)
}
