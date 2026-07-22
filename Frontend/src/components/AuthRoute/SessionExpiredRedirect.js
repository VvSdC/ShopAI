import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { logoutAction } from '../../redux/slices/users/usersSlice'

/** Soft session expiry — navigate to login without a full page reload. */
export default function SessionExpiredRedirect() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handler = () => {
      dispatch(logoutAction())
      navigate('/login', {
        replace: true,
        state: { from: location, sessionExpired: true },
      })
    }

    window.addEventListener('shopai:session-expired', handler)
    return () => window.removeEventListener('shopai:session-expired', handler)
  }, [dispatch, navigate, location])

  return null
}
