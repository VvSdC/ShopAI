import { useCallback, useEffect, useState } from 'react'
import axiosInstance from '../../../utils/axiosInstance'

const STATUS_STYLES = {
  idle: 'bg-stone-100 text-stone-600',
  testing: 'bg-blue-100 text-blue-700',
  working: 'bg-green-100 text-green-800',
  not_working: 'bg-red-100 text-red-800',
  not_configured: 'bg-amber-100 text-amber-800',
  rate_limited: 'bg-orange-100 text-orange-800',
}

function statusLabel(status, configured) {
  if (!configured) return 'Not configured'
  switch (status) {
    case 'working':
      return 'Working'
    case 'not_working':
      return 'Not working'
    case 'rate_limited':
      return 'Rate limited'
    case 'testing':
      return 'Testing…'
    default:
      return 'Not tested'
  }
}

function resultText(result, configured) {
  if (!configured) return 'Add API key in server config'
  if (result.status === 'testing') return 'Running test…'
  if (result.response) return result.response
  if (result.error) return result.error
  return '—'
}

export default function InferencePanel() {
  const [providers, setProviders] = useState([])
  const [selectedModels, setSelectedModels] = useState({})
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadProviders = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const { data } = await axiosInstance.get('/analytics/inference/providers')
      const list = data.providers || []
      setProviders(list)
      setSelectedModels((prev) => {
        const next = { ...prev }
        for (const provider of list) {
          if (!next[provider.id]) {
            next[provider.id] = provider.defaultModel
          }
        }
        return next
      })
    } catch (err) {
      setLoadError(
        err.response?.data?.message || 'Could not load inference providers.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  const runTest = async (providerId) => {
    setResults((prev) => ({
      ...prev,
      [providerId]: { status: 'testing' },
    }))

    try {
      const { data } = await axiosInstance.post('/analytics/inference/test', {
        providerId,
        model: selectedModels[providerId],
      })

      setResults((prev) => ({
        ...prev,
        [providerId]: {
          status: data.status || (data.ok ? 'working' : 'not_working'),
          response: data.response || '',
          error: data.error || '',
          model: data.model || selectedModels[providerId],
        },
      }))
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [providerId]: {
          status: 'not_working',
          error: err.response?.data?.message || 'Test request failed',
        },
      }))
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-stone-500">Loading inference providers…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Inference</h2>
        <p className="mt-2 text-sm text-stone-600">
          Send a short &quot;Hi&quot; message to each provider and verify the
          response.
        </p>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  Provider
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  Model
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  Result
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {providers.map((provider) => {
                const result = results[provider.id] || { status: 'idle' }
                const displayStatus = provider.configured
                  ? result.status
                  : 'not_configured'
                const badgeClass =
                  STATUS_STYLES[displayStatus] || STATUS_STYLES.idle
                const detail = resultText(result, provider.configured)

                return (
                  <tr key={provider.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-stone-900">
                      {provider.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-stone-700">
                      <select
                        value={
                          selectedModels[provider.id] || provider.defaultModel
                        }
                        onChange={(e) =>
                          setSelectedModels((prev) => ({
                            ...prev,
                            [provider.id]: e.target.value,
                          }))
                        }
                        disabled={!provider.configured}
                        className="block w-full min-w-[12rem] rounded-md border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
                      >
                        {provider.models.map((model) => (
                          <option key={model} value={model}>
                            {model}
                            {model === provider.defaultModel ? ' (default)' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
                      >
                        {statusLabel(displayStatus, provider.configured)}
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-4 text-sm text-stone-600">
                      <p
                        className={
                          result.error && provider.configured
                            ? 'text-red-700'
                            : result.response
                              ? 'text-green-800'
                              : ''
                        }
                        title={detail}
                      >
                        {detail}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                      <button
                        type="button"
                        onClick={() => runTest(provider.id)}
                        disabled={
                          result.status === 'testing' || !provider.configured
                        }
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {result.status === 'testing' ? 'Testing…' : 'Test'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
