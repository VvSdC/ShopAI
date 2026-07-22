import { useCallback, useEffect, useState } from 'react'
import axiosInstance from '../../../utils/axiosInstance'

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function formatMs(value) {
  const ms = Number(value || 0)
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms}ms`
}

function ErrorRateBadge({ rate }) {
  const n = Number(rate || 0)
  const tone =
    n === 0
      ? 'bg-emerald-100 text-emerald-800'
      : n < 5
        ? 'bg-stone-100 text-stone-700'
        : n < 15
          ? 'bg-amber-100 text-amber-800'
          : 'bg-rose-100 text-rose-800'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {n}%
    </span>
  )
}

export default function ToolUsagePanel() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await axiosInstance.get(
        `/analytics/chat-usage?days=${days}&source=chat_tool`
      )
      setData(res)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load tool usage.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const rows = data?.byTool || []
  const totalCalls = rows.reduce((sum, r) => sum + (r.calls || 0), 0)
  const totalErrors = rows.reduce((sum, r) => sum + (r.errorCount || 0), 0)
  const overallErrorRate =
    totalCalls > 0 ? Math.round((totalErrors / totalCalls) * 100) : 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Chat tools</h2>
          <p className="mt-1 text-sm text-stone-500">
            Every chat tool invocation is logged with latency and success. Use this to
            spot slow tools, buggy ones, or dead ones.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading && <p className="mt-8 text-sm text-stone-500">Loading tool metrics…</p>}

      {!loading && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-stone-500">Total tool calls</p>
              <p className="mt-2 text-3xl font-bold text-stone-900">
                {formatNumber(totalCalls)}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-stone-500">Distinct tools used</p>
              <p className="mt-2 text-3xl font-bold text-stone-900">
                {formatNumber(rows.length)}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-stone-500">Overall error rate</p>
              <p className="mt-2 text-3xl font-bold text-stone-900">
                {overallErrorRate}%
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {formatNumber(totalErrors)} failed calls
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-900">Per-tool breakdown</h3>
            <p className="mt-1 text-xs text-stone-500">
              Sorted by call volume. A rising latency or error rate is worth investigating.
            </p>
            {rows.length === 0 ? (
              <p className="mt-4 text-sm text-stone-500">
                No tool telemetry yet in this window. Once the chat starts serving
                users, this table populates automatically.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-stone-500">
                      <th className="py-2 pr-4">Tool</th>
                      <th className="py-2 pr-4">Calls</th>
                      <th className="py-2 pr-4">Errors</th>
                      <th className="py-2 pr-4">Error rate</th>
                      <th className="py-2">Avg latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.tool} className="border-b border-stone-50">
                        <td className="py-2 pr-4 font-mono text-stone-800">{row.tool}</td>
                        <td className="py-2 pr-4 text-stone-700">{formatNumber(row.calls)}</td>
                        <td className="py-2 pr-4 text-stone-700">
                          {formatNumber(row.errorCount || 0)}
                        </td>
                        <td className="py-2 pr-4">
                          <ErrorRateBadge rate={row.errorRate || 0} />
                        </td>
                        <td className="py-2 text-stone-700">{formatMs(row.avgLatencyMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
