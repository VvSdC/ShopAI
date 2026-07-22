import { useCallback, useEffect, useState } from 'react'
import axiosInstance from '../../../utils/axiosInstance'

const STATUS_STYLES = {
  ok: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  degraded: 'bg-amber-100 text-amber-800 ring-amber-200',
  down: 'bg-rose-100 text-rose-800 ring-rose-200',
  disabled: 'bg-stone-100 text-stone-600 ring-stone-200',
  unknown: 'bg-stone-100 text-stone-600 ring-stone-200',
}

function StatusPill({ status, label }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.unknown
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      {label || status || 'unknown'}
    </span>
  )
}

function Card({ title, status, children }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        {status && <StatusPill status={status} />}
      </div>
      <div className="mt-3 space-y-2 text-sm text-stone-600">{children}</div>
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-stone-500">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono' : ''} text-stone-800`}>{value}</span>
    </div>
  )
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

export default function SystemHealthPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await axiosInstance.get('/analytics/system-health')
      setData(res)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load system health.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(load, 30_000)
    return () => clearInterval(timer)
  }, [autoRefresh, load])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">System health</h2>
          <p className="mt-1 text-sm text-stone-500">
            Snapshot of the live process — MongoDB, Redis, LLM providers, background
            queues, embedding coverage, and recent traffic.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-stone-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
            />
            Auto-refresh every 30s
          </label>
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

      {loading && !data && (
        <p className="mt-8 text-sm text-stone-500">Checking system status…</p>
      )}

      {data && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <StatusPill status={data.status} label={`Overall: ${data.status}`} />
            <span className="text-xs text-stone-500">
              Checked at {new Date(data.checkedAt).toLocaleString()}
            </span>
            <span className="ml-auto text-xs text-stone-500">
              env <code className="rounded bg-stone-100 px-1.5 py-0.5">{data.process?.env}</code>
              {' · '}
              Node {data.process?.nodeVersion}
              {' · '}
              uptime {Math.round((data.process?.uptimeSeconds || 0) / 60)}m
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card title="MongoDB" status={data.mongo?.status}>
              <Row label="Latency" value={`${data.mongo?.latencyMs || 0} ms`} />
              {data.mongo?.detail && (
                <p className="text-xs text-rose-700">{data.mongo.detail}</p>
              )}
            </Card>

            <Card title="Redis" status={data.redis?.status}>
              <Row label="Latency" value={`${data.redis?.latencyMs || 0} ms`} />
              {data.redis?.detail && (
                <p className="text-xs text-stone-600">{data.redis.detail}</p>
              )}
            </Card>

            <Card title="LLM providers" status={data.providers?.status}>
              <Row
                label="Configured"
                value={`${data.providers?.configured || 0} / ${data.providers?.total || 0}`}
              />
              {data.providers?.missing?.length > 0 && (
                <p className="text-xs text-stone-500">
                  Missing keys: {data.providers.missing.join(', ')}
                </p>
              )}
            </Card>

            <Card title="Chat traffic (last 60m)" status={data.traffic?.chatErrorRate > 10 ? 'degraded' : 'ok'}>
              <Row label="Calls" value={formatNumber(data.traffic?.chatCalls || 0)} />
              <Row label="Errors" value={`${formatNumber(data.traffic?.chatErrors || 0)} (${data.traffic?.chatErrorRate || 0}%)`} />
              <Row label="Avg latency" value={`${data.traffic?.avgChatLatencyMs || 0} ms`} />
            </Card>

            <Card title="Embedding coverage" status={data.embeddings?.status}>
              <Row
                label="Indexed"
                value={`${formatNumber(data.embeddings?.indexedProducts || 0)} / ${formatNumber(data.embeddings?.totalProducts || 0)}`}
              />
              <Row label="Coverage" value={`${data.embeddings?.coveragePct || 0}%`} />
            </Card>

            <Card title="Process memory">
              <Row label="Heap used" value={`${data.process?.memoryMb?.heapUsed || 0} MB`} />
              <Row label="Heap total" value={`${data.process?.memoryMb?.heapTotal || 0} MB`} />
              <Row label="RSS" value={`${data.process?.memoryMb?.rss || 0} MB`} />
            </Card>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-900">Background queues</h3>
              <p className="mt-1 text-xs text-stone-500">
                Requires Redis. Disabled queues fall back to in-process paths where
                available.
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {Object.entries(data.queues || {}).map(([name, enabled]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2"
                  >
                    <span className="capitalize text-stone-700">
                      {name.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <StatusPill status={enabled ? 'ok' : 'disabled'} label={enabled ? 'enabled' : 'off'} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-900">Search configuration</h3>
              <div className="mt-3 space-y-2">
                <Row label="Similar products mode" value={data.similarProductsMode} mono />
                <Row label="Vector search backend" value={data.vectorSearchBackend} mono />
              </div>
              <p className="mt-3 text-xs text-stone-500">
                Similar products default to <code>simple</code> (category-scoped
                in-process cosine, cached in Redis) to avoid Atlas <code>$vectorSearch</code>
                {' '}minutes.
              </p>
            </div>
          </div>

          <RecentErrors />
        </>
      )}
    </div>
  )
}

function RecentErrors() {
  const [errors, setErrors] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: res } = await axiosInstance.get('/analytics/errors?days=3&limit=20')
        if (!cancelled) setErrors(res.errors || [])
      } catch {
        if (!cancelled) setErrors([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-900">Recent errors (last 3 days)</h3>
      {loading && <p className="mt-3 text-sm text-stone-500">Loading…</p>}
      {!loading && errors?.length === 0 && (
        <p className="mt-3 text-sm text-emerald-700">No LLM errors in the window.</p>
      )}
      {!loading && errors?.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Provider</th>
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Route</th>
                <th className="py-2 pr-4">Error</th>
                <th className="py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((row, idx) => (
                <tr key={`${row.createdAt}-${idx}`} className="border-b border-stone-50 align-top">
                  <td className="py-2 pr-4 text-xs text-stone-600">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 font-medium text-stone-800">{row.provider}</td>
                  <td className="py-2 pr-4 text-stone-600">{row.model || '—'}</td>
                  <td className="py-2 pr-4 text-stone-600">{row.route || row.span || '—'}</td>
                  <td className="py-2 pr-4">
                    <StatusPill status="down" label={row.errorType || 'error'} />
                  </td>
                  <td className="max-w-md py-2 text-xs text-stone-600 break-all">
                    {row.errorMessage || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
