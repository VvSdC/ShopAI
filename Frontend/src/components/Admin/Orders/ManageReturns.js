import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchAdminReturnsAction,
  approveReturnAction,
  rejectReturnAction,
  fetchReturnStatsAction,
} from '../../../redux/slices/returns/returnsSlice'

const STATUS_COLORS = {
  requested: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  refunded: 'bg-green-100 text-green-800',
}

const REASON_LABELS = {
  wrong_item: 'Wrong item',
  damaged: 'Damaged',
  size_fit: 'Size / fit',
  not_as_described: 'Not as described',
  poor_quality: 'Poor quality',
  late_delivery: 'Late delivery',
  ordered_by_mistake: 'Ordered by mistake',
  better_price: 'Better price',
  missing_parts: 'Missing parts',
  changed_mind: 'Changed mind',
  other: 'Other',
}

export default function ManageReturns() {
  const dispatch = useDispatch()
  const { adminReturns, stats, loading } = useSelector((state) => state.returns)
  const [statusFilter, setStatusFilter] = useState('requested')
  const [rejectId, setRejectId] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    dispatch(fetchAdminReturnsAction(statusFilter || undefined))
    dispatch(fetchReturnStatsAction())
  }, [dispatch, statusFilter])

  const handleApprove = async (id) => {
    setActionError('')
    const result = await dispatch(approveReturnAction({ id, adminNote: '' }))
    if (approveReturnAction.rejected.match(result)) {
      setActionError(result.payload?.message || 'Approval failed')
    } else {
      dispatch(fetchAdminReturnsAction(statusFilter || undefined))
      dispatch(fetchReturnStatsAction())
    }
  }

  const handleReject = async () => {
    if (!rejectNote.trim()) {
      setActionError('Rejection reason is required')
      return
    }
    setActionError('')
    const result = await dispatch(
      rejectReturnAction({ id: rejectId, adminNote: rejectNote })
    )
    if (rejectReturnAction.rejected.match(result)) {
      setActionError(result.payload?.message || 'Rejection failed')
    } else {
      setRejectId(null)
      setRejectNote('')
      dispatch(fetchAdminReturnsAction(statusFilter || undefined))
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Return requests</h2>
          <p className="text-sm text-gray-500">Review customer returns and process refunds</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="requested">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      {stats?.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Return reasons (items)</h3>
          <div className="flex flex-wrap gap-2">
            {stats.map((s) => (
              <span
                key={s._id}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >
                {REASON_LABELS[s._id] || s._id}: {s.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{actionError}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !adminReturns?.length ? (
        <p className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
          No return requests in this filter.
        </p>
      ) : (
        <div className="space-y-4">
          {adminReturns.map((req) => (
            <div key={req._id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    Order #{req.orderNumber}
                  </p>
                  <p className="text-sm text-gray-500">
                    {req.user?.fullname || 'Customer'} · {req.user?.email} ·{' '}
                    {new Date(req.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {req.status}
                </span>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                {req.items?.map((item, i) => (
                  <li key={i} className="rounded bg-gray-50 px-3 py-2">
                    {item.qty}× {item.name} —{' '}
                    <span className="text-gray-500">
                      {REASON_LABELS[item.reasonCode] || item.reasonCode}
                    </span>
                    {item.reasonComment && (
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {item.reasonComment}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {req.refundAmount > 0 && (
                <p className="mt-2 text-sm font-medium text-gray-900">
                  Refund: ₹{req.refundAmount}
                </p>
              )}
              {req.adminNote && (
                <p className="mt-2 text-sm text-gray-600">Note: {req.adminNote}</p>
              )}

              {req.status === 'requested' && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(req._id)}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Approve &amp; refund
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectId(req._id)
                      setRejectNote('')
                    }}
                    className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Reject return</h3>
            <p className="mt-1 text-sm text-gray-500">Tell the customer why this return was rejected.</p>
            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Reason for rejection"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="flex-1 rounded-md border border-gray-300 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white"
              >
                Reject request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
