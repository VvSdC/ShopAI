import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import axiosInstance from '../../../utils/axiosInstance'

function scoreClass(score) {
  if (score == null) return 'text-stone-500'
  if (score >= 8) return 'text-green-700'
  if (score >= 6) return 'text-amber-700'
  return 'text-red-700'
}

function progressPercent(completed, total) {
  if (!total) return 0
  return Math.min(100, Math.round((completed / total) * 100))
}

export default function ChatbotEvalPanel() {
  const [cases, setCases] = useState([])
  const [summary, setSummary] = useState(null)
  const [results, setResults] = useState([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const pollRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const loadCases = useCallback(async () => {
    setLoadingCases(true)
    setError('')
    try {
      const { data } = await axiosInstance.get('/analytics/chat-eval/cases')
      setCases(data.cases || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load evaluation cases.')
    } finally {
      setLoadingCases(false)
    }
  }, [])

  useEffect(() => {
    loadCases()
  }, [loadCases])

  const runEvaluation = async () => {
    stopPolling()
    setRunning(true)
    setError('')
    setSummary(null)
    setResults([])
    setProgress({ completed: 0, total: cases.length || 0, currentCase: null })

    try {
      const { data } = await axiosInstance.post('/analytics/chat-eval/run', {})
      const jobId = data.jobId
      if (!jobId) {
        throw new Error('No evaluation job id returned')
      }

      const pollStatus = async () => {
        const { data: statusData } = await axiosInstance.get(
          `/analytics/chat-eval/status/${jobId}`
        )
        const job = statusData.job

        setProgress({
          completed: job.completed || 0,
          total: job.total || cases.length || 0,
          currentCase: job.currentCase || null,
        })
        setResults(job.results || [])

        if (job.status === 'completed') {
          setSummary(job.summary || null)
          setProgress(null)
          setRunning(false)
          stopPolling()
        } else if (job.status === 'failed') {
          setError(job.error || 'Evaluation run failed.')
          setProgress(null)
          setRunning(false)
          stopPolling()
        }
      }

      await pollStatus()
      pollRef.current = setInterval(pollStatus, 1500)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Evaluation run failed.')
      setProgress(null)
      setRunning(false)
      stopPolling()
    }
  }

  if (loadingCases) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-stone-500">Loading evaluation cases…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Evaluate Chatbot</h2>
          <p className="mt-2 text-sm text-stone-600">
            Runs golden prompts through the live chatbot, scores replies with a judge
            model, and surfaces recommendations.
          </p>
        </div>
        <button
          type="button"
          onClick={runEvaluation}
          disabled={running}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? 'Running evaluation…' : 'Run evaluation'}
        </button>
      </div>

      {running && progress ? (
        <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-900">
                {progress.currentCase
                  ? `Evaluating case ${Math.min(progress.completed + 1, progress.total)} of ${progress.total}`
                  : progress.completed >= progress.total
                    ? 'Finishing up…'
                    : `Completed ${progress.completed} of ${progress.total}`}
              </p>
              {progress.currentCase ? (
                <p className="mt-1 text-sm text-indigo-800">
                  <span className="font-medium">{progress.currentCase.category}:</span>{' '}
                  {progress.currentCase.prompt}
                </p>
              ) : progress.completed < progress.total ? (
                <p className="mt-1 text-sm text-indigo-800">
                  Waiting before next case (rate-limit pause)…
                </p>
              ) : null}
            </div>
            <p className="text-sm font-semibold text-indigo-900">
              {progressPercent(progress.completed, progress.total)}%
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{
                width: `${progressPercent(progress.completed, progress.total)}%`,
              }}
            />
          </div>
          {results.length ? (
            <p className="mt-3 text-xs text-indigo-800">
              {results.filter((r) => r.passed).length} passed ·{' '}
              {results.filter((r) => !r.passed).length} failed so far
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {summary ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Overall score
            </p>
            <p className={`mt-2 text-3xl font-bold ${scoreClass(summary.overallScore)}`}>
              {summary.overallScore}/10
            </p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Passed
            </p>
            <p className="mt-2 text-3xl font-bold text-green-700">{summary.passed}</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Failed
            </p>
            <p className="mt-2 text-3xl font-bold text-red-700">{summary.failed}</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Test cases
            </p>
            <p className="mt-2 text-3xl font-bold text-stone-900">{summary.total}</p>
          </div>
        </div>
      ) : null}

      {summary?.recommendations?.length ? (
        <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <h3 className="text-sm font-semibold text-indigo-900">Recommendations</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-indigo-900">
            {summary.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 bg-stone-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-900">Test cases ({cases.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Prompt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Expected
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {cases.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-stone-900">
                    {item.category}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-700">{item.prompt}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{item.criteria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {results.length ? (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 bg-stone-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-stone-900">Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Case
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {results.map((result) => (
                  <Fragment key={result.id}>
                    <tr className="align-top">
                      <td className="px-4 py-4 text-sm">
                        <div className="font-medium text-stone-900">{result.category}</div>
                        <div className="mt-1 text-stone-600">{result.prompt}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span className={`font-semibold ${scoreClass(result.scores?.overall)}`}>
                          {result.scores?.overall ?? '—'}/10
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            result.passed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {result.passed ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                      <td className="max-w-md px-4 py-4 text-sm text-stone-600">
                        {result.notes || result.recommendation || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((prev) => (prev === result.id ? null : result.id))
                          }
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {expandedId === result.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === result.id ? (
                      <tr key={`${result.id}-details`}>
                        <td colSpan={5} className="bg-stone-50 px-4 py-4 text-sm text-stone-700">
                          <div className="space-y-3">
                            <div>
                              <p className="font-medium text-stone-900">Assistant reply</p>
                              <p className="mt-1 whitespace-pre-wrap rounded-md border border-stone-200 bg-white p-3">
                                {result.reply || result.error || 'No reply generated.'}
                              </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              {['relevance', 'scope', 'safety', 'helpfulness'].map((key) => (
                                <div key={key} className="rounded-md border border-stone-200 bg-white p-3">
                                  <p className="text-xs uppercase tracking-wide text-stone-500">
                                    {key}
                                  </p>
                                  <p className={`mt-1 font-semibold ${scoreClass(result.scores?.[key])}`}>
                                    {result.scores?.[key] ?? '—'}/10
                                  </p>
                                </div>
                              ))}
                            </div>
                            {result.toolsUsed?.length ? (
                              <p>
                                <span className="font-medium text-stone-900">Tools used:</span>{' '}
                                {result.toolsUsed.join(', ')}
                              </p>
                            ) : null}
                            {result.deterministic?.checks?.length ? (
                              <div>
                                <p className="font-medium text-stone-900">Deterministic checks</p>
                                <ul className="mt-1 list-disc pl-5">
                                  {result.deterministic.checks.map((check) => (
                                    <li key={check.id}>
                                      {check.label}:{' '}
                                      {check.passed ? 'passed' : 'failed'}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
