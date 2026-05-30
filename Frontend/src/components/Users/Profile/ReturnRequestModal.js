import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchReturnEligibilityAction,
  fetchReturnReasonsAction,
  submitReturnRequestAction,
  clearReturnEligibility,
} from '../../../redux/slices/returns/returnsSlice'

export default function ReturnRequestModal({ order, onClose, onSuccess }) {
  const dispatch = useDispatch()
  const { eligibility, reasons, loading, error } = useSelector((state) => state.returns)

  const [selections, setSelections] = useState({})

  useEffect(() => {
    dispatch(fetchReturnReasonsAction())
    dispatch(fetchReturnEligibilityAction(order._id))
    return () => {
      dispatch(clearReturnEligibility())
    }
  }, [dispatch, order._id])

  useEffect(() => {
    if (eligibility?.lines?.length) {
      const initial = {}
      eligibility.lines.forEach((line) => {
        initial[line.lineId] = {
          selected: false,
          qty: 1,
          reasonCode: '',
          reasonComment: '',
        }
      })
      setSelections(initial)
    }
  }, [eligibility])

  const toggleLine = (lineId) => {
    setSelections((prev) => ({
      ...prev,
      [lineId]: { ...prev[lineId], selected: !prev[lineId]?.selected },
    }))
  }

  const updateLine = (lineId, patch) => {
    setSelections((prev) => ({
      ...prev,
      [lineId]: { ...prev[lineId], ...patch },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const items = Object.entries(selections)
      .filter(([, v]) => v.selected)
      .map(([lineId, v]) => ({
        lineId,
        qty: Number(v.qty) || 1,
        reasonCode: v.reasonCode,
        reasonComment: v.reasonComment,
      }))

    if (!items.length) return

    const result = await dispatch(
      submitReturnRequestAction({ orderId: order._id, items })
    )
    if (submitReturnRequestAction.fulfilled.match(result)) {
      onSuccess?.(result.payload?.message)
      onClose()
    }
  }

  const errMsg =
    error?.message ||
    error?.errors?.[0]?.message ||
    (typeof error === 'string' ? error : null)

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
          <div className="border-b px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Request return — Order #{order.orderNumber}
            </h3>
            {eligibility?.message && (
              <p className="mt-1 text-sm text-gray-500">{eligibility.message}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="max-h-[65vh] overflow-y-auto px-6 py-4">
            {loading && !eligibility ? (
              <p className="text-sm text-gray-500">Checking eligibility…</p>
            ) : !eligibility?.eligible ? (
              <p className="text-sm text-red-600">
                {eligibility?.message || 'This order is not eligible for return.'}
              </p>
            ) : (
              <div className="space-y-4">
                {eligibility.lines.map((line) => {
                  const sel = selections[line.lineId] || {}
                  return (
                    <div
                      key={line.lineId}
                      className={`rounded-lg border p-4 ${
                        sel.selected ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200'
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={!!sel.selected}
                          onChange={() => toggleLine(line.lineId)}
                          className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{line.name}</p>
                          <p className="text-xs text-gray-500">
                            {line.color} · {line.size} · ₹{line.price} · up to{' '}
                            {line.returnableQty} returnable
                          </p>
                        </div>
                      </label>

                      {sel.selected && (
                        <div className="mt-3 space-y-3 pl-7">
                          <div>
                            <label className="text-xs font-medium text-gray-600">Quantity</label>
                            <input
                              type="number"
                              min={1}
                              max={line.returnableQty}
                              value={sel.qty}
                              onChange={(e) =>
                                updateLine(line.lineId, { qty: e.target.value })
                              }
                              className="mt-1 block w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Reason *</label>
                            <select
                              required
                              value={sel.reasonCode}
                              onChange={(e) =>
                                updateLine(line.lineId, { reasonCode: e.target.value })
                              }
                              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                            >
                              <option value="">Select a reason</option>
                              {reasons.map((r) => (
                                <option key={r.code} value={r.code}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {sel.reasonCode === 'other' && (
                            <div>
                              <label className="text-xs font-medium text-gray-600">
                                Please describe *
                              </label>
                              <textarea
                                required
                                rows={2}
                                maxLength={500}
                                value={sel.reasonComment}
                                onChange={(e) =>
                                  updateLine(line.lineId, { reasonComment: e.target.value })
                                }
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {errMsg && (
              <p className="mt-4 text-sm text-red-600">{errMsg}</p>
            )}
          </form>

          <div className="flex gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            {eligibility?.eligible && (
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Submitting…' : 'Submit return request'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
