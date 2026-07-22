import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import Swal from 'sweetalert2'

import { resetErrAction } from '../../redux/slices/globalActions/globalActions'
import formatApiError from '../../utils/formatApiError'

/**
 * @param {'toast' | 'inline' | 'both'} variant
 *   toast — SweetAlert only (legacy default)
 *   inline — persistent banner
 *   both — banner + toast
 */
const ErrorMsg = ({ message, variant = 'toast' }) => {
  const dispatch = useDispatch()
  const text = formatApiError(message)

  useEffect(() => {
    if (!text) return
    if (variant === 'inline') return

    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text,
    })
    dispatch(resetErrAction())
  }, [text, dispatch, variant])

  if (!text) return null

  if (variant === 'inline' || variant === 'both') {
    return (
      <div
        role="alert"
        className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      >
        <div className="flex items-start justify-between gap-3">
          <p>{text}</p>
          <button
            type="button"
            onClick={() => dispatch(resetErrAction())}
            className="shrink-0 text-xs font-semibold text-red-700 underline hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default ErrorMsg
