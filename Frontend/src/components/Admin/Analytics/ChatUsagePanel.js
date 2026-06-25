import { useCallback, useEffect, useMemo, useState } from 'react'
import axiosInstance from '../../../utils/axiosInstance'

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function formatMs(value) {
  const ms = Number(value || 0)
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms}ms`
}

function DeltaBadge({ pct }) {
  if (pct == null || pct === 0) {
    return <span className="text-xs text-stone-500">vs prior period: flat</span>
  }
  const up = pct > 0
  return (
    <span
      className={`text-xs font-medium ${up ? 'text-amber-700' : 'text-emerald-700'}`}
    >
      {up ? '▲' : '▼'} {Math.abs(pct)}% vs prior period
    </span>
  )
}

function StatCard({ label, value, hint, delta }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {delta != null && (
        <div className="mt-2">
          <DeltaBadge pct={delta} />
        </div>
      )}
    </div>
  )
}

function TokenBarChart({ daily }) {
  const maxTokens = useMemo(
    () => Math.max(...daily.map((d) => d.totalTokens), 1),
    [daily]
  )

  if (!daily.length) {
    return (
      <p className="text-sm text-stone-500">No usage data for this period yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex h-48 items-end gap-2 border-b border-stone-100 pb-2">
        {daily.map((day) => {
          const heightPct = Math.max(4, (day.totalTokens / maxTokens) * 100)
          return (
            <div
              key={day.date}
              className="group flex flex-1 flex-col items-center justify-end"
              title={`${day.date}: ${formatNumber(day.totalTokens)} tokens`}
            >
              <div
                className="flex w-full max-w-[2.5rem] flex-col overflow-hidden rounded-t-md bg-stone-100"
                style={{ height: `${heightPct}%` }}
              >
                <div
                  className="w-full bg-indigo-500"
                  style={{ flex: day.promptTokens || 1 }}
                />
                <div
                  className="w-full bg-violet-400"
                  style={{ flex: day.completionTokens || 1 }}
                />
              </div>
              <span className="mt-2 hidden text-[10px] text-stone-400 sm:block">
                {day.date.slice(5)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
          Input tokens
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-400" />
          Output tokens
        </span>
      </div>
    </div>
  )
}

function LatencyChart({ daily }) {
  const maxLatency = useMemo(
    () => Math.max(...daily.map((d) => d.avgLatencyMs), 1),
    [daily]
  )

  return (
    <div className="flex h-40 items-end gap-2">
      {daily.map((day) => {
        const heightPct = Math.max(6, (day.avgLatencyMs / maxLatency) * 100)
        return (
          <div key={`lat-${day.date}`} className="flex flex-1 flex-col items-center">
            <div
              className="w-full max-w-[2.5rem] rounded-t-md bg-emerald-500/80 transition-all"
              style={{ height: `${heightPct}%` }}
              title={`${day.date}: avg ${formatMs(day.avgLatencyMs)}`}
            />
            <span className="mt-2 hidden text-[10px] text-stone-400 sm:block">
              {day.date.slice(5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function BreakdownTable({ title, rows, valueKey }) {
  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        <p className="mt-3 text-sm text-stone-500">No data yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Calls</th>
              <th className="py-2 pr-4">Tokens</th>
              <th className="py-2">Avg latency</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[valueKey]} className="border-b border-stone-50">
                <td className="py-2 pr-4 font-medium capitalize text-stone-800">
                  {row[valueKey]}
                </td>
                <td className="py-2 pr-4 text-stone-600">{formatNumber(row.calls)}</td>
                <td className="py-2 pr-4 text-stone-600">
                  {formatNumber(row.totalTokens)}
                </td>
                <td className="py-2 text-stone-600">{formatMs(row.avgLatencyMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ChatUsagePanel() {
  const [days, setDays] = useState(7)
  const [source, setSource] = useState('chat')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadUsage = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await axiosInstance.get(
        `/analytics/chat-usage?days=${days}&source=${source}`
      )
      setData(res)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load chat usage analytics.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [days, source])

  useEffect(() => {
    loadUsage()
  }, [loadUsage])

  const summary = data?.summary

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Chat usage</h2>
          <p className="mt-1 text-sm text-stone-500">
            Input/output tokens, completion latency, and daily trends for chatbot LLM calls.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="chat">Production chat</option>
            <option value="eval">Eval runs</option>
            <option value="all">All sources</option>
          </select>
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
            onClick={loadUsage}
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

      {loading && (
        <p className="mt-8 text-sm text-stone-500">Loading usage metrics…</p>
      )}

      {!loading && summary && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Input tokens"
              value={formatNumber(summary.promptTokens)}
              delta={source === 'chat' ? summary.tokenDeltaPct : null}
            />
            <StatCard
              label="Output tokens"
              value={formatNumber(summary.completionTokens)}
            />
            <StatCard
              label="Avg completion time"
              value={formatMs(summary.avgLatencyMs)}
              hint={`Across ${formatNumber(summary.calls)} LLM calls`}
            />
            <StatCard
              label="Total tokens"
              value={formatNumber(summary.totalTokens)}
              hint={`~${formatNumber(summary.avgTokensPerCall)} per call`}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-900">Daily token usage</h3>
              <p className="mt-1 text-xs text-stone-500">
                Stacked bars show input vs output tokens per day.
              </p>
              <div className="mt-6">
                <TokenBarChart daily={data.daily || []} />
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-900">Avg completion time</h3>
              <p className="mt-1 text-xs text-stone-500">
                Mean LLM round-trip latency per day.
              </p>
              <div className="mt-6">
                <LatencyChart daily={data.daily || []} />
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <BreakdownTable
              title="By agent route"
              rows={data.byRoute}
              valueKey="route"
            />
            <BreakdownTable
              title="By provider"
              rows={data.byProvider}
              valueKey="provider"
            />
          </div>
        </>
      )}
    </div>
  )
}
