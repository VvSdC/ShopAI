import { Fragment, useEffect, useMemo, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/20/solid'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function triggerLabel(selected) {
  if (!selected.length) return 'All colors'
  if (selected.length === 1) return selected[0]
  return `${selected.length} colors selected`
}

export default function ColorFilterModal({ colors = [], value = [], onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState([])

  const selected = useMemo(() => {
    if (Array.isArray(value)) return value
    return value ? [value] : []
  }, [value])

  const selectedKey = selected.join('|')

  useEffect(() => {
    if (open) setDraft(selected)
  }, [open, selectedKey, selected])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filteredColors = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...(colors || [])].sort((a, b) =>
      String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
        sensitivity: 'base',
      })
    )
    if (!q) return list
    return list.filter((c) => String(c?.name || '').toLowerCase().includes(q))
  }, [colors, query])

  const toggleDraft = (colorName) => {
    setDraft((prev) =>
      prev.includes(colorName)
        ? prev.filter((name) => name !== colorName)
        : [...prev, colorName]
    )
  }

  const handleApply = () => {
    onChange([...draft].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })))
    setOpen(false)
  }

  const handleClearAll = () => setDraft([])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-sm text-stone-800 hover:border-stone-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <span
          className={classNames(
            'truncate capitalize',
            selected.length === 0 && 'text-stone-500'
          )}
        >
          {triggerLabel(selected)}
        </span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
      </button>

      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => setOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="flex max-h-[min(85vh,680px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-stone-900">
                      Filter by color
                    </Dialog.Title>
                    <p className="mt-0.5 text-sm text-stone-500">
                      Select one or more colors
                      {draft.length > 0 && (
                        <span className="font-medium text-indigo-600">
                          {' '}
                          · {draft.length} selected
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    aria-label="Close color filter"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="border-b border-stone-100 px-5 py-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search colors…"
                      className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  {filteredColors.length === 0 ? (
                    <p className="py-8 text-center text-sm text-stone-500">
                      No colors match “{query.trim()}”.
                    </p>
                  ) : (
                    <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                      {filteredColors.map((c) => {
                        const name = c?.name || ''
                        const checked = draft.includes(name)
                        const inputId = `color-filter-${c?._id || name}`
                        return (
                          <li key={c?._id || name}>
                            <label
                              htmlFor={inputId}
                              className="flex cursor-pointer items-center gap-2.5 rounded-md py-2 pr-2 hover:bg-stone-50"
                            >
                              <input
                                id={inputId}
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDraft(name)}
                                className="h-4 w-4 shrink-0 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span
                                style={{ backgroundColor: c?.hex || name }}
                                title={name}
                                className="h-4 w-4 shrink-0 rounded-full border border-stone-300"
                                aria-hidden
                              />
                              <span className="text-sm capitalize leading-tight text-stone-800">
                                {name}
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-5 py-4">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={draft.length === 0}
                    className="text-sm font-medium text-stone-600 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear all
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Apply
                      {draft.length > 0 ? ` (${draft.length})` : ''}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  )
}
