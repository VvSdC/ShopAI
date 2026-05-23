import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import Swal from 'sweetalert2'

import { resetErrAction } from '../../redux/slices/globalActions/globalActions'
import formatApiError from '../../utils/formatApiError'

const ErrorMsg = ({ message }) => {
  const dispatch = useDispatch()
  const text = formatApiError(message)

  useEffect(() => {
    if (!text) return
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text,
    })
    dispatch(resetErrAction())
  }, [text, dispatch])

  return null
}

export default ErrorMsg;
