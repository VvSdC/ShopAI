import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  fetchAdminReviewsAction,
  moderateReviewAction,
} from '../../../redux/slices/reviews/reviewsSlice'

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function ManageReviews() {
  const dispatch = useDispatch()
  const { adminReviews, adminLoading, error } = useSelector((state) => state.reviews)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    dispatch(fetchAdminReviewsAction(statusFilter || 'pending'))
  }, [dispatch, statusFilter])

  const handleModerate = async (id, status, reason = '') => {
    setActionError('')
    const result = await dispatch(moderateReviewAction({ id, status, reason }))
    if (moderateReviewAction.rejected.match(result)) {
      setActionError(result.payload?.message || 'Moderation failed')
      return
    }
    setRejectId(null)
    setRejectReason('')
    dispatch(fetchAdminReviewsAction(statusFilter || 'pending'))
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Review moderation</h2>
          <p className="text-sm text-stone-500">Approve or reject customer product reviews</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {(actionError || error?.message) && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {actionError || error?.message}
        </div>
      )}

      {adminLoading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : !adminReviews?.length ? (
        <p className="rounded-lg border border-dashed border-stone-300 py-12 text-center text-sm text-stone-500">
          No reviews in this filter.
        </p>
      ) : (
        <div className="space-y-4">
          {adminReviews.map((review) => (
            <article
              key={review._id}
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      STATUS_COLORS[review.moderationStatus] || 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {review.moderationStatus}
                  </span>
                  <p className="mt-2 text-sm text-stone-600">
                    {review.user?.name || review.user?.email || 'Customer'} ·{' '}
                    {review.product?.name ? (
                      <Link
                        to={`/products/${review.product._id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {review.product.name}
                      </Link>
                    ) : (
                      'Unknown product'
                    )}
                  </p>
                </div>
                <p className="text-sm font-semibold text-amber-600">{review.rating}/5</p>
              </div>
              <p className="mt-3 text-sm text-stone-800">{review.message}</p>
              {review.moderationReason && (
                <p className="mt-2 text-sm text-stone-500">Note: {review.moderationReason}</p>
              )}
              {review.moderationStatus === 'pending' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleModerate(review._id, 'approved')}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectId(review._id)}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">Reject review</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Reason for rejection (shown internally)"
              className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null)
                  setRejectReason('')
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleModerate(rejectId, 'rejected', rejectReason)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Reject review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
