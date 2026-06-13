import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getCurrentUserAction } from '../../redux/slices/users/usersSlice'
import AdminOnly from '../NotAuthorised/AdminOnly'
import LoadingComponent from '../LoadingComp/LoadingComponent'

const AdminRoutes = ({ children }) => {
  const dispatch = useDispatch()
  const { userAuth } = useSelector((state) => state?.users)
  const userInfo = userAuth?.userInfo
  const authLoading = userAuth?.loading
  const [sessionChecked, setSessionChecked] = useState(Boolean(userInfo))

  useEffect(() => {
    if (userInfo) {
      setSessionChecked(true)
      return undefined
    }

    let cancelled = false
    setSessionChecked(false)

    dispatch(getCurrentUserAction()).finally(() => {
      if (!cancelled) setSessionChecked(true)
    })

    return () => {
      cancelled = true
    }
  }, [dispatch, userInfo])

  if (!userInfo) {
    if (authLoading || !sessionChecked) return <LoadingComponent />
    return <AdminOnly />
  }

  if (!userInfo.isAdmin) return <AdminOnly />
  return <>{children}</>
}

export default AdminRoutes
