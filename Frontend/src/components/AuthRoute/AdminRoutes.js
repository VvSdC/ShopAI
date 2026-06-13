import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getCurrentUserAction } from '../../redux/slices/users/usersSlice'
import AdminOnly from '../NotAuthorised/AdminOnly'
import LoadingComponent from '../LoadingComp/LoadingComponent'

const AdminRoutes = ({ children }) => {
  const dispatch = useDispatch()
  const { userAuth } = useSelector((state) => state?.users)
  const userInfo = userAuth?.userInfo
  const authLoading = userAuth?.loading

  useEffect(() => {
    if (!userInfo) {
      dispatch(getCurrentUserAction())
    }
  }, [dispatch, userInfo])

  if (!userInfo) {
    if (authLoading) return <LoadingComponent />
    return <AdminOnly />
  }

  if (!userInfo.isAdmin) return <AdminOnly />
  return <>{children}</>
}

export default AdminRoutes;
