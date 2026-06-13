import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'

const AuthRoute = ({ children }) => {
  const location = useLocation()
  const { userAuth } = useSelector((state) => state?.users)
  const isLoggedIn = userAuth?.isLoggedIn

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default AuthRoute
