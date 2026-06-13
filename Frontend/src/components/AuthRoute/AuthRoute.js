import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { getCurrentUserAction } from '../../redux/slices/users/usersSlice'
import LoadingComponent from '../LoadingComp/LoadingComponent'

const AuthRoute = ({ children }) => {
  const dispatch = useDispatch()
  const location = useLocation()
  const [sessionChecked, setSessionChecked] = useState(false)
  const { userAuth } = useSelector((state) => state?.users)
  const isLoggedIn = userAuth?.isLoggedIn
  const authLoading = userAuth?.loading

  useEffect(() => {
    let cancelled = false

    dispatch(getCurrentUserAction()).finally(() => {
      if (!cancelled) setSessionChecked(true)
    })

    return () => {
      cancelled = true
    }
  }, [dispatch])

  if (authLoading || (!sessionChecked && !isLoggedIn)) {
    return <LoadingComponent />
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default AuthRoute
