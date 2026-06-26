import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import {
  startProactiveTokenRefresh,
  stopProactiveTokenRefresh,
} from '../../utils/axiosInstance'

/** Keeps the access token fresh while the user is logged in (access JWT TTL is 15m). */
export default function AuthTokenRefresh() {
  const isLoggedIn = useSelector((state) => state?.users?.userAuth?.isLoggedIn)

  useEffect(() => {
    if (!isLoggedIn) {
      stopProactiveTokenRefresh()
      return undefined
    }

    startProactiveTokenRefresh()
    return () => stopProactiveTokenRefresh()
  }, [isLoggedIn])

  return null
}
