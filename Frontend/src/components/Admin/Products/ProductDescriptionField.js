import { useState } from 'react'
import MarkdownContent from '../../common/MarkdownContent'

export default function ProductDescriptionField({ name, value, onChange }) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="product-description" className="block text-sm font-medium text-stone-700">
          Product description
        </label>
        <button
          type="button"
          onClick={() => setShowPreview((current) => !current)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          {showPreview ? 'Edit markdown' : 'Preview'}
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        Supports Markdown: headings, lists, links, **bold**, *italic*, and tables.
      </p>
      {showPreview ? (
        <div className="mt-2 min-h-[9rem] rounded-md border border-stone-200 bg-stone-50 p-4">
          {value?.trim() ? (
            <MarkdownContent>{value}</MarkdownContent>
          ) : (
            <p className="text-sm text-stone-400">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <textarea
            id="product-description"
            rows={6}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={'## Highlights\n\n- Premium materials\n- **Free returns** within 7 days'}
            className="block w-full rounded-md border border-stone-300 font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      )}
    </div>
  )
}
